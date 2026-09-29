import mongoose from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { toApiString, toDecimal128 } from '../src/platform/database/decimal.js';
import {
  registerPurchaseItem,
  registerPurchaseItems
} from '../src/modules/purchases/purchase-registration.service.js';
import {
  createPurchaseGroup,
  updatePurchaseGroup
} from '../src/modules/purchases/purchase.service.js';
import { splitPurchaseGroupBySupplier } from '../src/modules/purchases/purchase-split.service.js';

const id = () => new mongoose.Types.ObjectId();
const chain = (value) => ({ session: async () => value });
const sequenceModel = () => {
  let value = 0;
  return { findOneAndUpdate: async () => ({ value: ++value }) };
};
function item({ groupId, supplierId, quantity = '2', price = '30' } = {}) {
  const row = {
    _id: id(),
    groupId,
    supplierId,
    supplierSnapshot: { id: String(supplierId), name: 'مورد' },
    materialId: id(),
    materialSnapshot: { name: 'مادة' },
    unitSnapshot: { name: 'كيلو' },
    quantityLarge: toDecimal128(quantity),
    quantitySmall: toDecimal128(String(Number(quantity) * 1000)),
    largeUnitPrice: toDecimal128(price),
    lineTotal: toDecimal128(String(Number(quantity) * Number(price))),
    status: 'PENDING',
    version: 0,
    save: vi.fn(async () => {
      row.version += 1;
    })
  };
  return row;
}

describe('purchase supplier split', () => {
  it('groups one draft across suppliers and calculates each supplier subtotal', async () => {
    const groupId = id(),
      supplierA = id(),
      supplierB = id();
    const group = {
      _id: groupId,
      status: 'DRAFT',
      splitVersion: 0,
      splitOutdated: false,
      version: 0,
      save: vi.fn()
    };
    const rows = [
      item({ groupId, supplierId: supplierA, quantity: '2', price: '10' }),
      item({ groupId, supplierId: supplierA, quantity: '1', price: '5' }),
      item({ groupId, supplierId: supplierB, quantity: '3', price: '7' })
    ];
    const invoices = [];
    const models = {
      PurchaseGroup: { findOne: () => chain(group) },
      PurchaseItem: { exists: () => chain(null), find: () => chain(rows) },
      SupplierPurchaseInvoice: {
        deleteMany: vi.fn(),
        create: async ([value]) => {
          const invoice = {
            _id: id(),
            registeredCount: 0,
            status: 'UNREGISTERED',
            version: 0,
            save: vi.fn(),
            ...value
          };
          invoices.push(invoice);
          return [invoice];
        }
      }
    };
    const result = await splitPurchaseGroupBySupplier(
      groupId,
      { expectedVersion: 0 },
      { session: {}, actorId: id(), purchaseModels: models, sequenceModel: sequenceModel() }
    );
    expect(result.supplierInvoices).toHaveLength(2);
    expect(result.supplierInvoices.map((v) => toApiString(v.subtotal)).sort()).toEqual([
      '21',
      '25'
    ]);
    expect(new Set(rows.map((v) => String(v.supplierInvoiceId))).size).toBe(2);
    expect(group).toMatchObject({ status: 'SPLIT', splitVersion: 1, splitOutdated: false });
  });

  it('rejects a stale split before deleting or creating supplier invoices', async () => {
    const deleteMany = vi.fn(),
      create = vi.fn();
    const models = {
      PurchaseGroup: { findOne: () => chain(null) },
      PurchaseItem: {},
      SupplierPurchaseInvoice: { deleteMany, create }
    };
    await expect(
      splitPurchaseGroupBySupplier(
        id(),
        { expectedVersion: 3 },
        { session: {}, purchaseModels: models }
      )
    ).rejects.toMatchObject({ code: 'PURCHASE_SPLIT_VERSION_CONFLICT' });
    expect(deleteMany).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});

describe('purchase registration', () => {
  it('allows an expired receipt date, links batch and movement, and finishes statuses', async () => {
    const groupId = id(),
      invoiceId = id(),
      supplierId = id();
    const purchaseItem = item({ groupId, supplierId });
    purchaseItem.supplierInvoiceId = invoiceId;
    const group = {
      _id: groupId,
      status: 'SPLIT',
      splitOutdated: false,
      registeredCount: 0,
      version: 0,
      save: vi.fn()
    };
    const invoice = {
      _id: invoiceId,
      itemCount: 1,
      registeredCount: 0,
      status: 'UNREGISTERED',
      save: vi.fn()
    };
    const batch = {
      _id: id(),
      materialId: purchaseItem.materialId,
      supplierId,
      initialQuantitySmall: purchaseItem.quantitySmall,
      remainingQuantitySmall: purchaseItem.quantitySmall,
      purchaseLargeUnitPrice: purchaseItem.largeUnitPrice,
      initialInventoryValue: purchaseItem.lineTotal,
      remainingInventoryValue: purchaseItem.lineTotal,
      receivedOn: '2026-09-11',
      expiryOn: '2020-01-01',
      salePriority: 1,
      version: 0
    };
    const movement = {
      _id: id(),
      sequenceNo: 1,
      materialId: purchaseItem.materialId,
      batchId: batch._id,
      kind: 'PURCHASE_RECEIPT',
      quantitySmall: purchaseItem.quantitySmall,
      inventoryValue: purchaseItem.lineTotal,
      quantityAfterSmall: purchaseItem.quantitySmall,
      inventoryValueAfter: purchaseItem.lineTotal,
      occurredOn: '2026-09-11',
      recordedAt: new Date(),
      recordedBy: id(),
      sourceType: 'PURCHASE_RECEIPT_ITEM',
      sourceId: String(purchaseItem._id)
    };
    const createBatch = vi.fn(async () => ({ batch, movement }));
    const models = {
      PurchaseItem: {
        findOne: (query) =>
          chain(
            purchaseItem.status === 'PENDING' && query.version === purchaseItem.version
              ? purchaseItem
              : null
          ),
        find: () => chain([purchaseItem])
      },
      PurchaseGroup: { findOne: () => chain(group), findById: () => chain(group) },
      SupplierPurchaseInvoice: { find: () => chain([invoice]) }
    };
    const result = await registerPurchaseItem(
      purchaseItem._id,
      { receivedOn: '2026-09-11', expiryOn: '2020-01-01', expectedVersion: 0 },
      {
        session: {},
        actorId: id(),
        purchaseModels: models,
        sequenceModel: sequenceModel(),
        inventoryPort: { createBatch }
      }
    );
    expect(createBatch).toHaveBeenCalledWith(
      expect.objectContaining({ purchaseReceiptItemId: purchaseItem._id, expiryOn: '2020-01-01' }),
      expect.any(Object)
    );
    expect(String(result.item.batchId)).toBe(String(batch._id));
    expect(String(result.item.movementId)).toBe(String(movement._id));
    expect(group.status).toBe('REGISTERED');
    expect(invoice.status).toBe('REGISTERED');
    await expect(
      registerPurchaseItem(
        purchaseItem._id,
        { receivedOn: '2026-09-11', expiryOn: null, expectedVersion: 0 },
        {
          session: {},
          purchaseModels: models,
          sequenceModel: sequenceModel(),
          inventoryPort: { createBatch }
        }
      )
    ).rejects.toMatchObject({ code: 'PURCHASE_ITEM_ALREADY_REGISTERED_OR_STALE' });
    expect(createBatch).toHaveBeenCalledTimes(1);
  });

  it('validates that every register-many item belongs to the group before inventory writes', async () => {
    const createBatch = vi.fn();
    const group = { _id: id(), status: 'SPLIT', splitOutdated: false, version: 4 };
    const models = {
      PurchaseGroup: { findOne: () => chain(group) },
      PurchaseItem: { countDocuments: () => chain(1) }
    };
    await expect(
      registerPurchaseItems(
        group._id,
        {
          expectedVersion: 4,
          items: [
            {
              purchaseItemId: id(),
              receivedOn: '2026-09-11',
              expiryOn: null,
              expectedItemVersion: 0
            },
            {
              purchaseItemId: id(),
              receivedOn: '2026-09-11',
              expiryOn: null,
              expectedItemVersion: 0
            }
          ]
        },
        { session: {}, purchaseModels: models, inventoryPort: { createBatch } }
      )
    ).rejects.toMatchObject({ code: 'PURCHASE_ITEMS_GROUP_MISMATCH' });
    expect(createBatch).not.toHaveBeenCalled();
  });
});

describe('purchase group creation with several lines', () => {
  const material = (overrides = {}) => ({
    _id: id(),
    name: 'حليب',
    largeUnitId: id(),
    supplierId: overrides.supplierId ?? id(),
    conversionFactor: toDecimal128('1000'),
    referenceLargeUnitPrice: toDecimal128('40'),
    ...overrides
  });

  function models(rows) {
    const materials = rows.map(() => material());
    const itemCreate = vi.fn(async (docs) => docs.map((doc) => ({ _id: id(), ...doc })));
    return {
      itemCreate,
      models: {
        RawMaterial: { find: () => chain(materials) },
        MeasurementUnit: {
          find: () => chain(materials.map((m) => ({ _id: m.largeUnitId, nameAr: 'كيلو' })))
        },
        Supplier: {
          find: () =>
            chain([
              ...materials.map((m) => ({ _id: m.supplierId, name: 'مورد', phone: '0100' }))
            ])
        },
        PurchaseGroup: {
          create: vi.fn(async (docs) => docs.map((doc) => ({ _id: id(), version: 0, ...doc })))
        },
        PurchaseItem: { create: itemCreate },
        SupplierPurchaseInvoice: { deleteMany: vi.fn() }
      },
      materials
    };
  }

  const context = (m, extra = {}) => ({
    session: {},
    actorId: id(),
    purchaseModels: m,
    sequenceModel: sequenceModel(),
    ...extra
  });

  it('inserts every line of a multi-line group inside the transaction', async () => {
    const { models: m, itemCreate, materials } = models([1, 2]);
    const body = { items: materials.map((row) => ({ materialId: String(row._id), quantityLarge: '2', largeUnitPrice: '30' })) };
    const result = await createPurchaseGroup(body, context(m));
    expect(result.items).toHaveLength(2);
    expect(result.group.itemCount).toBe(2);
    // Mongoose refuses a session + multi-document create without ordered: true.
    expect(itemCreate.mock.calls[0][0]).toHaveLength(2);
    expect(itemCreate.mock.calls[0][1]).toMatchObject({ ordered: true });
    expect(toApiString(result.group.subtotal)).toBe('120');
  });

  it('rounds line totals to two decimals like batch inventory values', async () => {
    const { models: m, materials } = models([1]);
    const body = {
      items: [{ materialId: String(materials[0]._id), quantityLarge: '3', largeUnitPrice: '33.333' }]
    };
    const result = await createPurchaseGroup(body, context(m));
    expect(toApiString(result.items[0].lineTotal)).toBe('100');
    expect(toApiString(result.group.subtotal)).toBe('100');
  });

  it('replaces all lines on update with the same ordered insert', async () => {
    const { models: m, itemCreate, materials } = models([1, 2]);
    const group = { _id: id(), version: 0, status: 'DRAFT', save: vi.fn(async () => {}) };
    m.PurchaseGroup.findOne = () => chain(group);
    m.PurchaseItem.exists = () => chain(null);
    m.PurchaseItem.deleteMany = vi.fn();
    const body = {
      expectedVersion: 0,
      items: materials.map((row) => ({ materialId: String(row._id), quantityLarge: '1', largeUnitPrice: '10' }))
    };
    const result = await updatePurchaseGroup(group._id, body, context(m));
    expect(result.items).toHaveLength(2);
    expect(itemCreate.mock.calls[0][0]).toHaveLength(2);
    expect(itemCreate.mock.calls[0][1]).toMatchObject({ ordered: true });
    expect(group.itemCount).toBe(2);
    expect(group.save).toHaveBeenCalled();
  });

  it('still creates a single-line group', async () => {
    const { models: m, itemCreate, materials } = models([1]);
    const body = { items: [{ materialId: String(materials[0]._id), quantityLarge: '1', largeUnitPrice: '30' }] };
    const result = await createPurchaseGroup(body, context(m));
    expect(result.items).toHaveLength(1);
    expect(itemCreate.mock.calls[0][1]).toMatchObject({ ordered: true });
  });
});
