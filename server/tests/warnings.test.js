import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { toDecimal128 } from '../src/platform/database/decimal.js';
import {
  calculateDaysUntilExpiry,
  evaluateBatchExpiry,
  evaluateLowStock
} from '../src/modules/warnings/warning-evaluator.js';
import { getWarningsScreen, getWarningsSummary } from '../src/modules/warnings/warning.queries.js';

const query = (value) => ({
  select() {
    return this;
  },
  lean: async () => value
});

const ids = {
  supplier: new mongoose.Types.ObjectId(),
  material: new mongoose.Types.ObjectId(),
  batch: new mongoose.Types.ObjectId()
};
const material = (overrides = {}) => ({
  _id: ids.material,
  name: 'بن',
  supplierId: ids.supplier,
  status: 'ACTIVE',
  minStockSmall: toDecimal128('1000'),
  expiryAlertDays: 3,
  conversionFactor: toDecimal128('1000'),
  stockVersion: 7,
  ...overrides
});
const batch = (overrides = {}) => ({
  _id: ids.batch,
  materialId: ids.material,
  supplierId: ids.supplier,
  supplierSnapshot: { id: String(ids.supplier), name: 'المورد' },
  batchNumber: 'B-1',
  remainingQuantitySmall: toDecimal128('100'),
  expiryOn: '2026-09-14',
  version: 2,
  ...overrides
});
const models = (materials, batches) => ({
  RawMaterial: { find: () => query(materials) },
  RawMaterialBatch: { find: () => query(batches) }
});

describe('warning boundary evaluation', () => {
  it('treats zero stock as a critical low-stock warning', () => {
    expect(evaluateLowStock(material(), '0')).toMatchObject({
      type: 'LOW_STOCK',
      severity: 'CRITICAL',
      currentValue: '0',
      shortageSmall: '1000'
    });
  });

  it('includes stock equal to the configured minimum', () => {
    expect(evaluateLowStock(material(), '1000')).toMatchObject({ type: 'LOW_STOCK' });
    expect(evaluateLowStock(material(), '1000.001')).toBeNull();
  });

  it('classifies yesterday, today, the boundary day, and the following day', () => {
    const today = '2026-09-11';
    expect(calculateDaysUntilExpiry('2026-09-10', today)).toBe(-1);
    expect(evaluateBatchExpiry(batch({ expiryOn: '2026-09-10' }), today, 3)?.type).toBe('EXPIRED');
    expect(evaluateBatchExpiry(batch({ expiryOn: today }), today, 3)).toMatchObject({
      type: 'EXPIRING',
      severity: 'CRITICAL',
      daysUntilExpiry: 0
    });
    expect(evaluateBatchExpiry(batch({ expiryOn: '2026-09-14' }), today, 3)?.type).toBe('EXPIRING');
    expect(evaluateBatchExpiry(batch({ expiryOn: '2026-09-15' }), today, 3)).toBeNull();
  });

  it('does not warn for an empty expired batch', () => {
    expect(
      evaluateBatchExpiry(
        batch({ expiryOn: '2020-01-01', remainingQuantitySmall: toDecimal128('0') }),
        '2026-09-11',
        3
      )
    ).toBeNull();
  });
});

describe('warnings screen and summary', () => {
  it('counts positive stock at the minimum and refreshes after a threshold edit', async () => {
    const source = material({ minStockSmall: toDecimal128('100') });
    const context = { businessDate: '2026-09-11', warningModels: models([source], [batch()]), warningCache: new Map() };
    expect((await getWarningsSummary(context)).counts.nearMinimumStock).toBe(1);
    source.minStockSmall = toDecimal128('99');
    expect((await getWarningsSummary(context)).counts.nearMinimumStock).toBe(0);
    const empty = await getWarningsSummary({ ...context, warningModels: models([source], []) });
    expect(empty.counts.lowStock).toBe(1);
    expect(empty.counts.nearMinimumStock).toBe(0);
  });
  it('returns all derived types, stable pagination, Cairo date, and source versions', async () => {
    const result = await getWarningsScreen(
      { page: 1, limit: 2 },
      {
        businessDate: '2026-09-11',
        warningModels: models(
          [material()],
          [
            batch({ _id: new mongoose.Types.ObjectId(), expiryOn: '2026-09-10' }),
            batch({ _id: new mongoose.Types.ObjectId(), expiryOn: '2026-09-12' })
          ]
        )
      }
    );
    expect(result.summary).toEqual({ lowStock: 1, nearMinimumStock: 1, expiring: 1, expired: 1, openShiftLong: null });
    expect(result.items).toHaveLength(2);
    expect(result.pageMeta).toMatchObject({ page: 1, limit: 2, totalItems: 3, totalPages: 2 });
    expect(result.businessToday).toBe('2026-09-11');
    expect(result.timezone).toBe('Africa/Cairo');
    expect(result.sourceVersions.inventoryStockVersion).toBe(7);
  });

  it('raises one expiry warning per batch of the same material, never one per material', async () => {
    const first = batch({ _id: new mongoose.Types.ObjectId(), batchNumber: 'B-1', expiryOn: '2026-09-10' });
    const second = batch({ _id: new mongoose.Types.ObjectId(), batchNumber: 'B-2', expiryOn: '2026-09-13' });
    const third = batch({
      _id: new mongoose.Types.ObjectId(),
      batchNumber: 'B-3',
      expiryOn: '2026-10-30',
      remainingQuantitySmall: toDecimal128('500')
    });
    const result = await getWarningsScreen(
      { page: 1, limit: 10 },
      { businessDate: '2026-09-11', warningModels: models([material()], [first, second, third]) }
    );
    const expiryItems = result.items.filter((item) => item.type === 'EXPIRED' || item.type === 'EXPIRING');
    expect(expiryItems).toHaveLength(2);
    expect(expiryItems.map((item) => item.batch.id).sort()).toEqual(
      [String(first._id), String(second._id)].sort()
    );
    expect(expiryItems.map((item) => item.batch.batchNumber).sort()).toEqual(['B-1', 'B-2']);
    for (const item of expiryItems) {
      expect(item).toMatchObject({ scope: 'BATCH', material: { id: String(ids.material), conversionFactor: '1000' } });
      // The alert window stays a material setting; only the warning is batch-specific.
      expect(item.id).toBe(`${item.type}:${item.batch.id}`);
    }
    // The healthy far-future batch raises nothing.
    expect(expiryItems.some((item) => item.batch.batchNumber === 'B-3')).toBe(false);
    expect(result.summary).toMatchObject({ expiring: 1, expired: 1 });
  });

  it('keeps low stock warnings scoped to the whole material without a batch', async () => {
    const result = await getWarningsScreen(
      { page: 1, limit: 10 },
      { businessDate: '2026-09-11', warningModels: models([material()], [batch()]) }
    );
    const lowStock = result.items.find((item) => item.type === 'LOW_STOCK');
    expect(lowStock).toMatchObject({
      scope: 'MATERIAL',
      material: { conversionFactor: '1000' }
    });
    expect(lowStock.batch).toBeUndefined();
  });

  it('filters a warning type without changing the complete summary', async () => {
    const result = await getWarningsScreen(
      { type: 'EXPIRED', page: 1, limit: 10 },
      {
        businessDate: '2026-09-11',
        warningModels: models([material()], [batch({ expiryOn: '2026-09-10' })])
      }
    );
    expect(result.items.map((item) => item.type)).toEqual(['EXPIRED']);
    expect(result.summary.lowStock).toBe(1);
  });

  it('reports source failure as data-quality error instead of false zero counts', async () => {
    const summary = await getWarningsSummary({
      businessDate: '2026-09-11',
      warningModels: {
        RawMaterial: {
          find: () => ({
            select() {
              return this;
            },
            lean: async () => {
              throw new Error('source down');
            }
          })
        },
        RawMaterialBatch: { find: () => query([]) }
      }
    });
    expect(summary.counts).toBeNull();
    expect(summary.dataQuality).toBe('ERROR');
    expect(summary.failedSources).toEqual(['rawMaterials']);
  });

  it('invalidates a cached evaluation when an inventory source version changes', async () => {
    const warningCache = new Map();
    const currentMaterial = material({ stockVersion: 1 });
    const currentBatch = batch({ remainingQuantitySmall: toDecimal128('100') });
    const warningModels = models([currentMaterial], [currentBatch]);
    const first = await getWarningsSummary({
      businessDate: '2026-09-11',
      warningModels,
      warningCache
    });
    currentMaterial.stockVersion = 2;
    currentBatch.version = 3;
    currentBatch.remainingQuantitySmall = toDecimal128('2000');
    const second = await getWarningsSummary({
      businessDate: '2026-09-11',
      warningModels,
      warningCache
    });
    expect(first.counts.lowStock).toBe(1);
    expect(second.counts.lowStock).toBe(0);
    expect(second.sourceVersions.materials).not.toBe(first.sourceVersions.materials);
    expect(warningCache.size).toBe(2);
  });
});
