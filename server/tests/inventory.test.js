import mongoose from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { toApiString, toDecimal128 } from '../src/platform/database/decimal.js';
import {
  allocateRecipeRequirements,
  consumeFromBatch,
  createBatchFromPurchase,
  reorderBatchPriorities,
  restoreAllocations,
  simulateRecipeRequirements,
  updateBatchExpiry,
  withdrawBatchQuantity
} from '../src/modules/inventory/inventory.service.js';
import { createRawMaterial } from '../src/modules/inventory/material.service.js';
import { calculateConversionFactor } from '../src/modules/inventory/unit.service.js';

const chain = (value) => ({
  session: async () => value,
  lean: async () => value,
  sort() {
    return this;
  }
});
function batch({
  id = new mongoose.Types.ObjectId(),
  materialId = new mongoose.Types.ObjectId(),
  quantity = '1000',
  value = '100',
  priority = 1,
  expiryOn = '2020-01-01',
  version = 0
} = {}) {
  const item = {
    _id: id,
    materialId,
    initialQuantitySmall: toDecimal128(quantity),
    remainingQuantitySmall: toDecimal128(quantity),
    initialInventoryValue: toDecimal128(value),
    remainingInventoryValue: toDecimal128(value),
    salePriority: priority,
    expiryOn,
    version,
    save: vi.fn(async () => {
      item.version += 1;
    })
  };
  return item;
}
function movementModel(rows = []) {
  return {
    create: async ([value]) => {
      const row = { _id: new mongoose.Types.ObjectId(), ...value };
      rows.push(row);
      return [row];
    }
  };
}

describe('measurement conversion and allocation simulation', () => {
  it('derives the large-to-small factor from compatible physical units', () => {
    expect(
      calculateConversionFactor(
        { kind: 'MASS', physicalFactor: toDecimal128('1000') },
        { kind: 'MASS', physicalFactor: toDecimal128('1') }
      )
    ).toBe('1000');
  });

  it('crosses batches by priority and permits an expired batch', async () => {
    const materialId = new mongoose.Types.ObjectId();
    const first = batch({
      materialId,
      quantity: '600',
      value: '60',
      priority: 1,
      expiryOn: '2020-01-01'
    });
    const second = batch({
      materialId,
      quantity: '800',
      value: '160',
      priority: 2,
      expiryOn: '2030-01-01'
    });
    const models = { RawMaterialBatch: { find: () => chain([first, second]) } };
    const plan = await simulateRecipeRequirements([{ materialId, quantitySmall: '1000' }], {
      models
    });
    expect(plan.map((item) => item.quantitySmall)).toEqual(['600', '400']);
    expect(plan[0].expiryOn).toBe('2020-01-01');
    expect(plan.map((item) => item.inventoryValue)).toEqual(['60', '80']);
  });

  it('fails before writing when the combined batches are insufficient', async () => {
    const materialId = new mongoose.Types.ObjectId();
    const models = {
      RawMaterialBatch: { find: () => chain([batch({ materialId, quantity: '10' })]) }
    };
    await expect(
      simulateRecipeRequirements([{ materialId, quantitySmall: '11' }], { models })
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_STOCK', status: 409 });
  });
});

describe('inventory consumption and restoration', () => {
  it('sets both quantity and value to exact zero on the final exit', async () => {
    const item = batch({ quantity: '3', value: '10' });
    const movements = [];
    const result = await consumeFromBatch(
      item,
      '3',
      { type: 'ORDER_ITEM', id: 'oi1', kind: 'SALE_CONSUMPTION', occurredOn: '2026-09-11' },
      {
        session: {},
        actorId: new mongoose.Types.ObjectId(),
        models: { InventoryMovement: movementModel(movements) }
      }
    );
    expect(toApiString(result.batch.remainingQuantitySmall)).toBe('0');
    expect(toApiString(result.batch.remainingInventoryValue)).toBe('0');
    expect(toApiString(result.inventoryValue)).toBe('10');
  });

  it('returns an already-restored allocation without changing its batch twice', async () => {
    const allocation = { _id: 'a1', status: 'REVERSED' };
    const models = {
      InventoryAllocation: { findById: () => chain(allocation) },
      RawMaterialBatch: { findById: vi.fn() }
    };
    const result = await restoreAllocations(['a1'], 'إلغاء الطلب', { session: {}, models });
    expect(result[0].alreadyRestored).toBe(true);
    expect(models.RawMaterialBatch.findById).not.toHaveBeenCalled();
  });

  it('restores the exact consumed quantity and value and records one reversal', async () => {
    const materialId = new mongoose.Types.ObjectId();
    const item = batch({ materialId, quantity: '10', value: '20', version: 1 });
    item.remainingQuantitySmall = toDecimal128('4');
    item.remainingInventoryValue = toDecimal128('8');
    const allocation = {
      _id: new mongoose.Types.ObjectId(),
      materialId,
      batchId: item._id,
      consumptionMovementId: new mongoose.Types.ObjectId(),
      quantitySmall: toDecimal128('6'),
      inventoryValue: toDecimal128('12'),
      status: 'CONSUMED',
      save: vi.fn()
    };
    const movements = [];
    const models = {
      InventoryAllocation: { findById: () => chain(allocation) },
      RawMaterialBatch: { findById: () => chain(item) },
      InventoryMovement: movementModel(movements),
      RawMaterial: { updateOne: vi.fn() }
    };
    const [result] = await restoreAllocations(['a1'], 'إلغاء منتج', {
      session: {},
      businessDate: '2026-09-11',
      actorId: new mongoose.Types.ObjectId(),
      models
    });
    expect(result.alreadyRestored).toBe(false);
    expect(toApiString(item.remainingQuantitySmall)).toBe('10');
    expect(toApiString(item.remainingInventoryValue)).toBe('20');
    expect(allocation.status).toBe('REVERSED');
    expect(movements).toHaveLength(1);
    expect(movements[0].kind).toBe('SALE_CANCELLATION_RESTORE');
  });

  it('defaults the reversal movement date when no business date is provided', async () => {
    const materialId = new mongoose.Types.ObjectId();
    const item = batch({ materialId, quantity: '10', value: '20', version: 1 });
    item.remainingQuantitySmall = toDecimal128('4');
    item.remainingInventoryValue = toDecimal128('8');
    const allocation = {
      _id: new mongoose.Types.ObjectId(),
      materialId,
      batchId: item._id,
      consumptionMovementId: new mongoose.Types.ObjectId(),
      quantitySmall: toDecimal128('6'),
      inventoryValue: toDecimal128('12'),
      status: 'CONSUMED',
      save: vi.fn()
    };
    const movements = [];
    const models = {
      InventoryAllocation: { findById: () => chain(allocation) },
      RawMaterialBatch: { findById: () => chain(item) },
      InventoryMovement: movementModel(movements),
      RawMaterial: { updateOne: vi.fn() }
    };
    const [result] = await restoreAllocations(['a1'], 'إلغاء منتج', {
      session: {},
      actorId: new mongoose.Types.ObjectId(),
      models
    });
    expect(result.alreadyRestored).toBe(false);
    expect(movements).toHaveLength(1);
    expect(movements[0].occurredOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('consumes across two batches and stores the actual cost allocations', async () => {
    const materialId = new mongoose.Types.ObjectId();
    const first = batch({ materialId, quantity: '3', value: '6', priority: 1 });
    const second = batch({ materialId, quantity: '7', value: '21', priority: 2 });
    const movements = [];
    const allocations = [];
    const byId = new Map([
      [String(first._id), first],
      [String(second._id), second]
    ]);
    const models = {
      RawMaterialBatch: {
        find: () => chain([first, second]),
        findOne: (query) =>
          chain(
            byId.get(String(query._id))?.version === query.version
              ? byId.get(String(query._id))
              : null
          )
      },
      InventoryMovement: movementModel(movements),
      InventoryAllocation: {
        create: async ([value]) => {
          const row = { _id: new mongoose.Types.ObjectId(), ...value };
          allocations.push(row);
          return [row];
        }
      },
      RawMaterial: {
        updateMany: vi.fn(),
        find: () => ({ select: () => ({ session: () => ({ lean: async () => [] }) }) })
      }
    };
    const result = await allocateRecipeRequirements(
      [{ materialId, quantitySmall: '5' }],
      {
        type: 'ORDER_ITEM',
        id: new mongoose.Types.ObjectId(),
        orderItemId: new mongoose.Types.ObjectId(),
        occurredOn: '2026-09-11'
      },
      { session: {}, actorId: new mongoose.Types.ObjectId(), models }
    );
    expect(result.plan.map((part) => part.quantitySmall)).toEqual(['3', '2']);
    expect(result.allocations.map((part) => toApiString(part.inventoryValue))).toEqual(['6', '6']);
    expect(toApiString(first.remainingQuantitySmall)).toBe('0');
    expect(toApiString(second.remainingQuantitySmall)).toBe('5');
    expect(movements).toHaveLength(2);
  });

  it('rejects a stale allocation plan so two requests cannot consume the last stock', async () => {
    const materialId = new mongoose.Types.ObjectId();
    const snapshot = batch({ materialId, quantity: '5', value: '5', version: 0 });
    const models = {
      RawMaterialBatch: { find: () => chain([snapshot]), findOne: () => chain(null) },
      InventoryMovement: movementModel(),
      InventoryAllocation: { create: vi.fn() },
      RawMaterial: { updateMany: vi.fn() }
    };
    await expect(
      allocateRecipeRequirements(
        [{ materialId, quantitySmall: '5' }],
        { type: 'ORDER_ITEM', id: 'oi1', occurredOn: '2026-09-11' },
        { session: {}, models }
      )
    ).rejects.toMatchObject({ code: 'INVENTORY_RACE_CONFLICT', retryable: true });
    expect(models.InventoryAllocation.create).not.toHaveBeenCalled();
  });

  it('uses expected batch version to close a sale-versus-withdrawal race', async () => {
    const materialId = new mongoose.Types.ObjectId();
    const material = {
      _id: materialId,
      conversionFactor: toDecimal128('1000'),
      smallQuantityStep: toDecimal128('1'),
      stockVersion: 2,
      save: vi.fn()
    };
    const models = {
      RawMaterial: { findById: () => chain(material) },
      RawMaterialBatch: { findOne: () => chain(null) }
    };
    await expect(
      withdrawBatchQuantity(
        {
          materialId,
          batchId: new mongoose.Types.ObjectId(),
          quantityLarge: '1',
          reason: 'تالف نهائي',
          occurredOn: '2026-09-11',
          expectedBatchVersion: 0
        },
        { session: {}, models }
      )
    ).rejects.toMatchObject({ code: 'BATCH_VERSION_CONFLICT', status: 409 });
  });
});

describe('material creation idempotency', () => {
  it('replays a duplicate material write for the same operation key', async () => {
    const opId = new mongoose.Types.ObjectId();
    const supplierId = new mongoose.Types.ObjectId();
    const largeId = new mongoose.Types.ObjectId();
    const smallId = new mongoose.Types.ObjectId();
    const stored = { _id: new mongoose.Types.ObjectId(), name: '???' };
    let creates = 0;
    const models = {
      MeasurementUnit: { findById: (value) => chain(String(value) === String(largeId) ? { _id: largeId, kind: 'MASS', physicalFactor: toDecimal128('1000'), isActive: true } : { _id: smallId, kind: 'MASS', physicalFactor: toDecimal128('1'), isActive: true }) },
      RawMaterial: {
        create: async ([value]) => { creates += 1; if (creates > 1) throw Object.assign(new Error('duplicate'), { code: 11000 }); return [{ ...value, _id: new mongoose.Types.ObjectId() }]; },
        findOne: () => ({ lean: async () => stored })
      }
    };
    const context = { session: {}, actorType: 'EMPLOYEE', actorId: new mongoose.Types.ObjectId(), requestId: 'request-1', operationRequestId: opId, models, supplierModels: { Supplier: { findById: () => chain({ _id: supplierId }) } } };
    const input = { name: '???', supplierId: String(supplierId), largeUnitId: String(largeId), smallUnitId: String(smallId), conversionFactor: '1000', smallQuantityStep: '1', minStockSmall: '0', expiryAlertDays: 30 };
    const first = await createRawMaterial(input, context);
    expect(first.name).toBe('???');
    const replay = await createRawMaterial(input, context);
    expect(replay.replayed).toBe(true);
    expect(String(replay._id)).toBe(String(stored._id));
    expect(creates).toBe(2);
  });
});

describe('stock version atomic increments', () => {
  const stockMaterial = (overrides = {}) => ({
    _id: new mongoose.Types.ObjectId(),
    supplierId: new mongoose.Types.ObjectId(),
    conversionFactor: toDecimal128('1000'),
    smallQuantityStep: toDecimal128('1'),
    currency: 'EGP',
    stockVersion: 7,
    save: vi.fn(),
    ...overrides
  });

  it('bumps stockVersion with $inc when a purchase batch is created', async () => {
    const material = stockMaterial();
    const updateOne = vi.fn(async () => ({}));
    const models = {
      RawMaterial: { findById: () => chain(material), updateOne },
      RawMaterialBatch: {
        findOne: () => chain(null),
        create: async ([value]) => [{ ...value, _id: new mongoose.Types.ObjectId(), save: vi.fn() }]
      },
      InventoryMovement: movementModel()
    };
    const result = await createBatchFromPurchase(
      {
        materialId: material._id,
        supplierId: material.supplierId,
        quantityLarge: '2',
        largeUnitPrice: '50',
        batchNumber: 'B-7',
        receivedOn: '2026-09-11',
        expiryOn: '2027-01-01'
      },
      { session: {}, actorId: new mongoose.Types.ObjectId(), models }
    );
    expect(updateOne).toHaveBeenCalledWith(
      { _id: material._id },
      { $inc: { stockVersion: 1 } },
      expect.objectContaining({ session: expect.anything() })
    );
    expect(material.stockVersion).toBe(8);
    expect(result.material.stockVersion).toBe(8);
    expect(material.save).toHaveBeenCalledTimes(1);
  });

  it('bumps stockVersion with $inc on withdrawal without saving the material', async () => {
    const material = stockMaterial();
    const item = batch({ materialId: material._id, quantity: '5000', value: '250', version: 0 });
    const updateOne = vi.fn(async () => ({}));
    const models = {
      RawMaterial: { findById: () => chain(material), updateOne },
      RawMaterialBatch: { findOne: () => chain(item) },
      InventoryMovement: movementModel()
    };
    const result = await withdrawBatchQuantity(
      {
        materialId: material._id,
        batchId: item._id,
        quantityLarge: '1',
        reason: 'تالف نهائي',
        occurredOn: '2026-09-11',
        expectedBatchVersion: 0
      },
      { session: {}, actorId: new mongoose.Types.ObjectId(), models }
    );
    expect(updateOne).toHaveBeenCalledWith(
      { _id: material._id },
      { $inc: { stockVersion: 1 } },
      expect.objectContaining({ session: expect.anything() })
    );
    expect(material.save).not.toHaveBeenCalled();
    expect(result.material.stockVersion).toBe(8);
    expect(result.withdrawal.quantitySmall).toBe('1000');
  });

  it('rejects a batch whose expiry predates its receipt before any write', async () => {
    const material = {
      _id: new mongoose.Types.ObjectId(),
      supplierId: new mongoose.Types.ObjectId(),
      conversionFactor: toDecimal128('1000'),
      smallQuantityStep: toDecimal128('1'),
      currency: 'EGP',
      stockVersion: 0,
      save: vi.fn()
    };
    const batchCreate = vi.fn();
    const movementCreate = vi.fn();
    const models = {
      RawMaterial: { findById: () => chain(material), updateOne: vi.fn() },
      RawMaterialBatch: { findOne: () => chain(null), create: batchCreate },
      InventoryMovement: { create: movementCreate }
    };
    await expect(
      createBatchFromPurchase(
        {
          materialId: material._id,
          supplierId: material.supplierId,
          quantityLarge: '1',
          largeUnitPrice: '50',
          batchNumber: 'B-8',
          receivedOn: '2026-09-11',
          expiryOn: '2026-09-10'
        },
        { session: {}, actorId: new mongoose.Types.ObjectId(), models }
      )
    ).rejects.toMatchObject({ code: 'BATCH_EXPIRY_BEFORE_RECEIPT', status: 422 });
    expect(batchCreate).not.toHaveBeenCalled();
    expect(movementCreate).not.toHaveBeenCalled();
    expect(material.save).not.toHaveBeenCalled();
  });

  it('bumps stockVersion with $inc on expiry update without saving the material', async () => {
    const material = stockMaterial();
    const item = batch({ materialId: material._id, version: 0 });
    const updateOne = vi.fn(async () => ({}));
    const models = {
      RawMaterial: { findById: () => chain(material), updateOne },
      RawMaterialBatch: { findOne: () => chain(item) }
    };
    const result = await updateBatchExpiry(
      material._id,
      item._id,
      { expectedBatchVersion: 0, expiryOn: '2027-06-01' },
      {
        session: {},
        actorId: new mongoose.Types.ObjectId(),
        actorType: 'EMPLOYEE',
        requestId: 'test-request',
        sequenceModel: { findOneAndUpdate: async () => ({ value: 1 }) },
        auditModel: { create: async ([v]) => [v] },
        outboxModel: { create: async ([v]) => [v] },
        models
      }
    );
    expect(updateOne).toHaveBeenCalledWith(
      { _id: material._id },
      { $inc: { stockVersion: 1 } },
      expect.objectContaining({ session: expect.anything() })
    );
    expect(material.save).not.toHaveBeenCalled();
    expect(material.stockVersion).toBe(8);
    expect(result.expiryOn).toBe('2027-06-01');
  });
});

describe('sale deduction splitting, priority, cost, and expiry warnings', () => {
  const allocateModels = (batches, { materialName = null } = {}) => {
    const byId = new Map(batches.map((row) => [String(row._id), row]));
    // Mirror the query sort ({ salePriority: 1, _id: 1 }) since mocks bypass MongoDB.
    const ordered = [...batches].sort(
      (a, b) => a.salePriority - b.salePriority || (String(a._id) < String(b._id) ? -1 : 1)
    );
    return {
      RawMaterialBatch: {
        find: () => chain(ordered),
        findOne: (query) => chain(byId.get(String(query._id)) ?? null)
      },
      InventoryMovement: movementModel(),
      InventoryAllocation: { create: async ([v]) => [{ _id: new mongoose.Types.ObjectId(), ...v }] },
      RawMaterial: {
        updateMany: vi.fn(),
        find: () => ({
          select: () => ({
            session: () => ({
              lean: async () => (materialName ? [{ _id: batches[0].materialId, name: materialName }] : [])
            })
          })
        })
      }
    };
  };
  const allocateCtx = (models) => ({
    session: {},
    businessDate: '2026-09-11',
    actorId: new mongoose.Types.ObjectId(),
    models
  });
  const source = { type: 'ORDER_ITEM', id: 'oi1', orderItemId: 'oi1', occurredOn: '2026-09-11', reason: 'تأكيد طلب' };

  it('takes the remainder and continues with the next priority batch at its own price', async () => {
    const materialId = new mongoose.Types.ObjectId();
    const first = batch({ materialId, quantity: '300', value: '30', priority: 1, expiryOn: '2030-01-01' });
    const second = batch({ materialId, quantity: '1000', value: '200', priority: 2, expiryOn: '2030-01-01' });
    const { allocations, warnings } = await allocateRecipeRequirements(
      [{ materialId, quantitySmall: '1000' }],
      source,
      allocateCtx(allocateModels([first, second]))
    );
    expect(allocations.map((row) => toApiString(row.quantitySmall))).toEqual(['300', '700']);
    expect(allocations.map((row) => toApiString(row.inventoryValue))).toEqual(['30', '140']);
    expect(toApiString(first.remainingQuantitySmall)).toBe('0');
    expect(toApiString(second.remainingQuantitySmall)).toBe('300');
    expect(warnings).toEqual([]);
  });

  it('consumes batches strictly in sale-priority order', async () => {
    const materialId = new mongoose.Types.ObjectId();
    const low = batch({ materialId, quantity: '50', value: '5', priority: 2, expiryOn: '2030-01-01' });
    const high = batch({ materialId, quantity: '50', value: '10', priority: 1, expiryOn: '2030-01-01' });
    const last = batch({ materialId, quantity: '50', value: '15', priority: 3, expiryOn: '2030-01-01' });
    const { allocations } = await allocateRecipeRequirements(
      [{ materialId, quantitySmall: '120' }],
      source,
      allocateCtx(allocateModels([low, high, last]))
    );
    expect(allocations.map((row) => toApiString(row.quantitySmall))).toEqual(['50', '50', '20']);
    expect(allocations.map((row) => String(row.batchId))).toEqual([
      String(high._id),
      String(low._id),
      String(last._id)
    ]);
  });

  it('prices a partial take proportionally to its batch value', async () => {
    const materialId = new mongoose.Types.ObjectId();
    const models = { RawMaterialBatch: { find: () => chain([batch({ materialId, quantity: '1000', value: '100', expiryOn: '2030-01-01' })]) } };
    const plan = await simulateRecipeRequirements([{ materialId, quantitySmall: '333' }], {
      ...allocateCtx(models),
      models
    });
    expect(plan).toHaveLength(1);
    expect(plan[0].inventoryValue).toBe('33.3');
  });

  it('warns about expired batches while still completing the deduction', async () => {
    const materialId = new mongoose.Types.ObjectId();
    const expired = batch({ materialId, quantity: '1000', value: '100', priority: 1, expiryOn: '2026-09-01' });
    expired.batchNumber = 'B-9';
    const { allocations, warnings } = await allocateRecipeRequirements(
      [{ materialId, quantitySmall: '200' }],
      source,
      allocateCtx(allocateModels([expired], { materialName: 'بن' }))
    );
    expect(allocations).toHaveLength(1);
    expect(toApiString(expired.remainingQuantitySmall)).toBe('800');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      materialId: String(materialId),
      batchId: String(expired._id),
      batchNumber: 'B-9',
      expiryOn: '2026-09-01',
      daysOverdue: 10,
      quantitySmall: '200',
      materialName: 'بن'
    });
  });

  it('returns no warnings when every consumed batch is still valid', async () => {
    const materialId = new mongoose.Types.ObjectId();
    const fresh = batch({ materialId, quantity: '1000', value: '100', priority: 1, expiryOn: '2030-01-01' });
    const { warnings } = await allocateRecipeRequirements(
      [{ materialId, quantitySmall: '100' }],
      source,
      allocateCtx(allocateModels([fresh], { materialName: 'بن' }))
    );
    expect(warnings).toEqual([]);
  });
});

describe('batch priority uniqueness', () => {
  it('reorders in two phases so the unique index never sees a transient duplicate', async () => {
    const materialId = new mongoose.Types.ObjectId();
    const saves = [];
    const mkBatch = (priority) => {
      const row = {
        _id: new mongoose.Types.ObjectId(),
        salePriority: priority,
        save: vi.fn(async () => {
          saves.push(row.salePriority);
        })
      };
      return row;
    };
    const first = mkBatch(3);
    const second = mkBatch(1);
    const third = mkBatch(2);
    const material = { _id: materialId, priorityVersion: 4, save: vi.fn() };
    const models = {
      RawMaterial: { findOne: () => chain(material) },
      RawMaterialBatch: { find: () => chain([first, second, third]) }
    };
    const result = await reorderBatchPriorities(
      materialId,
      { expectedPriorityVersion: 4, orderedBatchIds: [String(second._id), String(third._id), String(first._id)] },
      { session: {}, models }
    );
    // Phase 1 wrote unique negatives, phase 2 wrote the finals 1..3.
    expect(saves.slice(0, 3).every((value) => value < 0)).toBe(true);
    expect(new Set(saves.slice(0, 3)).size).toBe(3);
    expect(result.batches).toEqual([
      { id: String(first._id), salePriority: 3 },
      { id: String(second._id), salePriority: 1 },
      { id: String(third._id), salePriority: 2 }
    ]);
    expect(material.priorityVersion).toBe(5);
    expect(material.save).toHaveBeenCalledTimes(1);
  });

  it('translates a priority duplicate key into a retryable conflict', async () => {
    const materialId = new mongoose.Types.ObjectId();
    const supplierId = new mongoose.Types.ObjectId();
    const material = {
      _id: materialId,
      supplierId,
      conversionFactor: toDecimal128('1000'),
      smallQuantityStep: toDecimal128('1'),
      currency: 'EGP',
      stockVersion: 0,
      save: vi.fn()
    };
    const duplicate = Object.assign(new Error('duplicate priority'), {
      code: 11000,
      keyPattern: { materialId: 1, salePriority: 1 }
    });
    const models = {
      RawMaterial: { findById: () => chain(material), updateOne: vi.fn() },
      RawMaterialBatch: { findOne: () => chain(null), create: async () => { throw duplicate; } },
      InventoryMovement: movementModel()
    };
    await expect(
      createBatchFromPurchase(
        {
          materialId,
          supplierId,
          quantityLarge: '1',
          largeUnitPrice: '50',
          batchNumber: 'B-1',
          receivedOn: '2026-09-11',
          expiryOn: '2027-01-01'
        },
        { session: {}, actorId: new mongoose.Types.ObjectId(), models }
      )
    ).rejects.toMatchObject({ code: 'BATCH_PRIORITY_CONFLICT', status: 409, retryable: true });
  });

  it('rethrows non-priority duplicate keys untouched', async () => {
    const materialId = new mongoose.Types.ObjectId();
    const supplierId = new mongoose.Types.ObjectId();
    const material = {
      _id: materialId,
      supplierId,
      conversionFactor: toDecimal128('1000'),
      smallQuantityStep: toDecimal128('1'),
      currency: 'EGP',
      stockVersion: 0,
      save: vi.fn()
    };
    const duplicate = Object.assign(new Error('duplicate batch number'), {
      code: 11000,
      keyPattern: { batchNumber: 1 }
    });
    const models = {
      RawMaterial: { findById: () => chain(material), updateOne: vi.fn() },
      RawMaterialBatch: { findOne: () => chain(null), create: async () => { throw duplicate; } },
      InventoryMovement: movementModel()
    };
    await expect(
      createBatchFromPurchase(
        {
          materialId,
          supplierId,
          quantityLarge: '1',
          largeUnitPrice: '50',
          batchNumber: 'B-1',
          receivedOn: '2026-09-11',
          expiryOn: '2027-01-01'
        },
        { session: {}, actorId: new mongoose.Types.ObjectId(), models }
      )
    ).rejects.toMatchObject({ code: 11000 });
  });
});
