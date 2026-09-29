import mongoose from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { getRawMaterialDetails, getRawMaterialsScreen, listWithdrawals, movementDto } from '../src/modules/inventory/inventory.queries.js';
import { getPurchaseReturnsScreen } from '../src/modules/purchase-returns/purchase-return.queries.js';
import { registerItemBody, registerManyBody } from '../src/modules/purchases/purchase.validation.js';

const query = (value) => ({ sort() { return this; }, skip() { return this; }, limit() { return this; }, lean: async () => value });

describe('inventory expiry and returns search', () => {
  it('requires expiry dates for individual and bulk registration', () => {
    expect(registerItemBody.safeParse({ receivedOn: '2026-09-28', expectedVersion: 0 }).success).toBe(false);
    const item = { purchaseItemId: new mongoose.Types.ObjectId().toString(), receivedOn: '2026-09-28', expiryOn: '2026-12-31', expectedItemVersion: 0 };
    expect(registerManyBody.safeParse({ expectedVersion: 0, items: [item] }).success).toBe(true);
    expect(registerManyBody.safeParse({ expectedVersion: 0, items: [{ ...item, expiryOn: null }] }).success).toBe(false);
  });

  it('finds the earliest dated stocked batch even with undated legacy batches', async () => {
    const materialId = new mongoose.Types.ObjectId();
    const material = { _id: materialId, supplierId: 's', largeUnitId: 'kg', smallUnitId: 'g', name: 'بن', conversionFactor: '1000', smallQuantityStep: '1', minStockSmall: '100' };
    const result = await getRawMaterialsScreen({}, { models: {
      RawMaterial: { find: () => query([material]), countDocuments: async () => 1 },
      MeasurementUnit: { find: () => query([]) },
      RawMaterialBatch: { find: vi.fn((filter) => {
        expect(filter.remainingQuantitySmall).toEqual({ $gt: 0 });
        return query([null, '', '2026-12-31', '2026-10-01'].map((expiryOn) => ({ materialId, expiryOn, remainingQuantitySmall: '10' })));
      }) },
    } });
    expect(result.materials[0].nextExpiry).toBe('2026-10-01');
  });

  it('searches supplier names literally and uses the same filter for rows and totals', async () => {
    const returnId = new mongoose.Types.ObjectId();
    const find = vi.fn(() => query([]));
    const distinct = vi.fn(async () => [returnId]);
    const countDocuments = vi.fn(async () => 0);
    const aggregate = vi.fn(async () => []);
    await getPurchaseReturnsScreen({ supplierSearch: 'مورد (بن)+', page: 2 }, { returnModels: {
      PurchaseReturnItem: { distinct }, PurchaseReturn: { find, countDocuments, aggregate },
    } });
    expect(distinct).toHaveBeenCalledWith('returnId', { 'supplierSnapshot.name': { $regex: 'مورد \\(بن\\)\\+', $options: 'i' } });
    expect(find).toHaveBeenCalledWith({ _id: { $in: [returnId] } });
    expect(countDocuments).toHaveBeenCalledWith({ _id: { $in: [returnId] } });
    expect(aggregate.mock.calls[0][0][0]).toEqual({ $match: { _id: { $in: [returnId] } } });
  });

  it('exposes withdrawal quantities in the large unit from the material snapshot', () => {
    const movement = {
      _id: new mongoose.Types.ObjectId(), sequenceNo: 4, kind: 'WITHDRAWAL',
      materialId: 'm1', batchId: 'b1', quantitySmall: '250', quantityAfterSmall: '750',
      inventoryValue: '112.50', inventoryValueAfter: '337.50', occurredOn: '2026-09-28',
      recordedBy: 'u1', reason: 'هالك', materialSnapshot: { name: 'بن', conversionFactor: '1000' },
    };
    const dto = movementDto(movement);
    expect(dto.quantitySmall).toBe('250');
    expect(dto.quantityLarge).toBe('0.25');
    expect(dto.quantityAfterSmall).toBe('750');
    expect(dto.quantityAfterLarge).toBe('0.75');
    expect(dto.conversionFactor).toBe('1000');
  });

  it('keeps small-unit withdrawals readable when no conversion factor was snapshotted', () => {
    const dto = movementDto({
      _id: new mongoose.Types.ObjectId(), sequenceNo: 1, kind: 'WITHDRAWAL',
      materialId: 'm1', batchId: 'b1', quantitySmall: '250', quantityAfterSmall: '750',
      inventoryValue: '112.50', inventoryValueAfter: '337.50', occurredOn: '2026-09-28',
      recordedBy: 'u1', reason: 'هالك',
    });
    expect(dto.quantitySmall).toBe('250');
    expect(dto.quantityLarge).toBeNull();
    expect(dto.quantityAfterLarge).toBeNull();
    expect(dto.conversionFactor).toBeNull();
  });

  it('lists withdrawals with the large-unit columns intact', async () => {
    const find = vi.fn(() => query([{
      _id: new mongoose.Types.ObjectId(), sequenceNo: 2, kind: 'WITHDRAWAL',
      materialId: 'm1', batchId: 'b1', quantitySmall: '1000', quantityAfterSmall: '2000',
      inventoryValue: '450.00', inventoryValueAfter: '900.00', occurredOn: '2026-09-28',
      recordedBy: 'u1', reason: 'هالك', materialSnapshot: { name: 'بن', conversionFactor: '1000' },
    }]));
    const countDocuments = vi.fn(async () => 1);
    const result = await listWithdrawals({}, { models: { InventoryMovement: { find, countDocuments } } });
    expect(result.items[0].quantityLarge).toBe('1');
    expect(result.items[0].quantityAfterLarge).toBe('2');
  });

  it('returns stock totals and the last purchase price on the details payload', async () => {
    const materialId = new mongoose.Types.ObjectId();
    const material = {
      _id: materialId, supplierId: 's1', largeUnitId: 'kg', smallUnitId: 'g', name: 'بن',
      conversionFactor: '1000', smallQuantityStep: '1', minStockSmall: '100',
      referenceLargeUnitPrice: { toString: () => '450.00' }, priorityVersion: 1,
      stockVersion: 3, version: 2, unitsLocked: true, currency: 'EGP',
    };
    const batches = [
      {
        materialId, batchNumber: 'BAT-0000001', salePriority: 1, version: 2,
        expiryOn: '2026-10-01', initialQuantitySmall: '2000', remainingQuantitySmall: '1200',
        initialInventoryValue: '900.00', remainingInventoryValue: '540.00',
        purchaseLargeUnitPrice: '450.00', receivedOn: '2026-09-01',
      },
      {
        materialId, batchNumber: 'BAT-0000000', salePriority: 2, version: 1,
        expiryOn: null, initialQuantitySmall: '1000', remainingQuantitySmall: '0',
        initialInventoryValue: '400.00', remainingInventoryValue: '0.00',
        purchaseLargeUnitPrice: '400.00', receivedOn: '2026-08-01',
      },
    ];
    const result = await getRawMaterialDetails(String(materialId), ['batches'], { models: {
      RawMaterial: { findById: () => ({ lean: async () => material }) },
      RawMaterialBatch: { find: () => query(batches) },
    } });

    // The summary cards read these: stock 1200 small = 1.2 large.
    expect(result.material.stockSmall).toBe('1200');
    expect(result.material.stockLarge).toBe('1.2');
    expect(result.material.lastPurchasePrice).toBe('450.00');
    expect(result.material.nextExpiry).toBe('2026-10-01');
    expect(result.stockSummary.stockLarge).toBe('1.2');
  });

  it('falls back to the newest batch price when no reference price exists', async () => {
    const materialId = new mongoose.Types.ObjectId();
    const material = {
      _id: materialId, supplierId: 's1', largeUnitId: 'kg', smallUnitId: 'g', name: 'بن',
      conversionFactor: '1000', smallQuantityStep: '1', minStockSmall: '100',
      priorityVersion: 1, stockVersion: 1, version: 1, unitsLocked: true, currency: 'EGP',
    };
    const result = await getRawMaterialDetails(String(materialId), [], { models: {
      RawMaterial: { findById: () => ({ lean: async () => material }) },
      RawMaterialBatch: { find: () => query([
        { materialId, expiryOn: null, remainingQuantitySmall: '100', remainingInventoryValue: '40.00', purchaseLargeUnitPrice: '400.00', receivedOn: '2026-08-01' },
        { materialId, expiryOn: '2026-11-01', remainingQuantitySmall: '200', remainingInventoryValue: '110.00', purchaseLargeUnitPrice: '550.00', receivedOn: '2026-09-01' },
      ]) },
    } });
    expect(result.material.lastPurchasePrice).toBe('550.00');
  });
});
