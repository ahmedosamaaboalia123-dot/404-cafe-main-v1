import mongoose from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { toApiString, toDecimal128 } from '../src/platform/database/decimal.js';
import {
  collectReceivable,
  createSupplier,
  deleteSupplier,
  payDebt,
  recordDebt,
  recordReceivable,
  deleteSupplierEntry,
  updateSupplierEntry
} from '../src/modules/suppliers/supplier.service.js';
import { normalizePhone } from '../src/shared/utils/normalize-phone.js';

const chain = (value) => ({ session: async () => value });

/**
 * Mirrors what `createSupplierSettlement` really
 * return: the `{ transaction, shift }` pair produced by `createCashTransaction`.
 * Mocking a flat document here is what allowed the `drawerTransactionId` reads in
 * `supplier.service.js` to resolve to `undefined` without any test noticing.
 */
function settlementPortMock(extra = {}) {
  return vi.fn(async (request) => ({
    transaction: { _id: new mongoose.Types.ObjectId(), ...request, balanceAfter: '900', ...extra },
    shift: { _id: new mongoose.Types.ObjectId(), version: 1 }
  }));
}
function buildContext({
  debt = '0',
  receivable = '0',
  supplierStatus = 'ACTIVE',
  existingReversal = false,
  drawerPort
} = {}) {
  const entries = [];
  const account = {
    _id: new mongoose.Types.ObjectId(),
    supplierId: new mongoose.Types.ObjectId(),
    version: 0,
    currency: 'EGP',
    debtBalance: toDecimal128(debt),
    receivableBalance: toDecimal128(receivable),
    markModified: vi.fn(),
    save: vi.fn(async () => {
      account.version += 1;
    })
  };
  const supplier = { _id: account.supplierId, status: supplierStatus };
  const models = {
    Supplier: { findById: () => chain(supplier) },
    SupplierAccount: {
      findOne: (filter) => chain(filter.version === account.version ? account : null)
    },
    SupplierAccountEntry: {
      create: async ([value]) => {
        const entry = { ...value, _id: value._id ?? new mongoose.Types.ObjectId(), save: vi.fn() };
        entries.push(entry);
        return [entry];
      },
      exists: () => chain(existingReversal ? { _id: 'reversal' } : null),
      findById: (id) => chain(entries.find((row) => String(row._id) === String(id))),
      find: () => ({ sort: () => chain(entries) }),
      bulkWrite: vi.fn(),
      deleteOne: async ({ _id }) => { const index = entries.findIndex((row) => String(row._id) === String(_id)); if (index >= 0) entries.splice(index, 1); },
    }
  };
  const context = {
    session: {},
    actorType: 'EMPLOYEE',
    actorId: new mongoose.Types.ObjectId(),
    requestId: 'request-1',
    businessDate: '2026-09-11',
    models,
    drawerPort,
    auditModel: { create: async ([value]) => [value] },
    sequenceModel: { findOneAndUpdate: async () => ({ value: 1 }) },
    outboxModel: { create: async ([value]) => [value] }
  };
  return { context, account, supplier, entries, models };
}
const input = (kind, amount, version = 0) => ({
  kind,
  amount,
  occurredOn: '2026-09-10',
  notes: 'قيد يدوي',
  expectedAccountVersion: version
});

describe('supplier manual balances', () => {
  it('creates the supplier and both zero balances atomically', async () => {
    const supplierId = new mongoose.Types.ObjectId();
    const models = {
      Supplier: {
        create: async ([value]) => [
          { _id: supplierId, version: 0, createdAt: new Date(), ...value }
        ]
      },
      SupplierAccount: {
        create: async ([value]) => [{ _id: new mongoose.Types.ObjectId(), version: 0, ...value }]
      }
    };
    const context = {
      session: {},
      actorType: 'EMPLOYEE',
      actorId: new mongoose.Types.ObjectId(),
      requestId: 'r1',
      currency: 'EGP',
      models,
      auditModel: { create: async ([value]) => [value] },
      sequenceModel: { findOneAndUpdate: async () => ({ value: 1 }) },
      outboxModel: { create: async ([value]) => [value] }
    };
    const result = await createSupplier(
      {
        name: 'مورد البن',
        contactPerson: 'أحمد',
        phone: '01001234567',
        supplierType: 'بن',
        city: 'القاهرة'
      },
      context
    );
    expect(toApiString(result.account.debtBalance)).toBe('0');
    expect(toApiString(result.account.receivableBalance)).toBe('0');
    expect(result.supplier.normalizedName).toBe('مورد البن');
    expect(result.supplier.phoneNormalized).toBe('+201001234567');
  });

  it('records debt and receivable independently without touching the drawer', async () => {
    const state = buildContext();
    const debt = await recordDebt(state.supplier._id, input('DEBT', '100.25'), state.context);
    expect(toApiString(debt.account.debtBalance)).toBe('100.25');
    expect(toApiString(debt.account.receivableBalance)).toBe('0');
    expect(debt.drawerTransaction).toBeNull();
    const receivable = await recordReceivable(
      state.supplier._id,
      input('RECEIVABLE', '40', 1),
      state.context
    );
    expect(toApiString(receivable.account.debtBalance)).toBe('100.25');
    expect(toApiString(receivable.account.receivableBalance)).toBe('40');
    expect(state.entries.map((entry) => entry.occurredOn)).toEqual(['2026-09-10', '2026-09-10']);
  });

  it('publishes account changes on the account aggregate with its own sequence', async () => {
    const state = buildContext();
    const published = [];
    state.context.outboxModel.create = async ([value]) => {
      published.push(value);
      return [value];
    };

    await recordDebt(state.supplier._id, input('DEBT', '10'), state.context);
    await recordDebt(state.supplier._id, input('DEBT', '5', 1), state.context);

    expect(published).toHaveLength(2);
    expect(published.map(({ aggregateType, aggregateId, sequence }) => ({ aggregateType, aggregateId, sequence }))).toEqual([
      { aggregateType: 'SupplierAccount', aggregateId: String(state.account._id), sequence: 1 },
      { aggregateType: 'SupplierAccount', aggregateId: String(state.account._id), sequence: 2 }
    ]);
  });

  it('rejects a debt payment larger than the balance before calling the drawer', async () => {
    const drawerPort = { createSupplierSettlement: vi.fn() };
    const state = buildContext({ debt: '50', drawerPort });
    await expect(
      payDebt(state.supplier._id, input('DEBT_PAYMENT', '50.01'), state.context)
    ).rejects.toMatchObject({ code: 'PAYMENT_EXCEEDS_DEBT', status: 409 });
    expect(drawerPort.createSupplierSettlement).not.toHaveBeenCalled();
    expect(toApiString(state.account.debtBalance)).toBe('50');
  });

  it('refuses a cash settlement when the production drawer adapter is unavailable', async () => {
    const state = buildContext({ debt: '50' });
    await expect(
      payDebt(state.supplier._id, input('DEBT_PAYMENT', '10'), state.context)
    ).rejects.toMatchObject({ code: 'DRAWER_SERVICE_UNAVAILABLE', status: 503, retryable: true });
  });

  /**
   * The port mock returns the real adapter's shape - `{ transaction, shift }` from
   * `createCashTransaction` - not a flat document. The previous flat mock is what
   * let `drawerTransactionId` silently resolve to `undefined` in production while
   * this suite stayed green.
   */
  it('settles exact debt through a cash OUT transaction in the same command', async () => {
    const drawerPort = { createSupplierSettlement: settlementPortMock() };
    const state = buildContext({ debt: '50', drawerPort });
    const result = await payDebt(state.supplier._id, input('DEBT_PAYMENT', '50'), state.context);
    expect(toApiString(result.account.debtBalance)).toBe('0');
    expect(drawerPort.createSupplierSettlement).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: 'OUT',
        amount: '50',
        sourceType: 'SUPPLIER_ACCOUNT_ENTRY'
      }),
      expect.any(Object)
    );
    expect(result.entry.drawerTransactionId).toBeTruthy();
    expect(String(result.entry.drawerTransactionId)).toBe(String(result.drawerTransaction.transaction._id));
  });

  it('allows only one effect when the same account version is submitted twice', async () => {
    const state = buildContext();
    await recordDebt(state.supplier._id, input('DEBT', '10', 0), state.context);
    await expect(
      recordDebt(state.supplier._id, input('DEBT', '10', 0), state.context)
    ).rejects.toMatchObject({ code: 'SUPPLIER_ACCOUNT_VERSION_CONFLICT' });
    expect(state.entries).toHaveLength(1);
    expect(toApiString(state.account.debtBalance)).toBe('10');
  });

  it('collects receivable only up to the balance through cash IN', async () => {
    const drawerPort = { createSupplierSettlement: settlementPortMock() };
    const state = buildContext({ receivable: '75', drawerPort });
    const result = await collectReceivable(
      state.supplier._id,
      input('RECEIVABLE_COLLECTION', '25'),
      state.context
    );
    expect(toApiString(result.account.receivableBalance)).toBe('50');
    expect(drawerPort.createSupplierSettlement).toHaveBeenCalledWith(
      expect.objectContaining({ direction: 'IN' }),
      expect.any(Object)
    );
    expect(result.entry.drawerTransactionId).toBeTruthy();
  });

  it('does not apply the removed supplier status to new balances or settlements', async () => {
    const drawerPort = { createSupplierSettlement: settlementPortMock() };
    const state = buildContext({ debt: '20', supplierStatus: 'INACTIVE', drawerPort });
    await expect(recordDebt(state.supplier._id, input('DEBT', '1'), state.context)).resolves.toBeTruthy();
    await expect(
      payDebt(state.supplier._id, input('DEBT_PAYMENT', '20', 1), state.context)
    ).resolves.toBeTruthy();
  });

  it('rejects stale account versions to close concurrent balance races', async () => {
    const state = buildContext({ debt: '20' });
    await expect(
      recordDebt(state.supplier._id, input('DEBT', '1', 9), state.context)
    ).rejects.toMatchObject({ code: 'SUPPLIER_ACCOUNT_VERSION_CONFLICT', status: 409 });
  });
});

describe('direct supplier entry changes', () => {
  it('edits the same entry repeatedly and deletes it without reversal rows', async () => {
    const state = buildContext();
    const created = await recordDebt(state.supplier._id, input('DEBT', '100'), state.context);
    const edit = { amount: '80', occurredOn: '2026-09-12', notes: 'تعديل', reason: 'تصحيح', expectedAccountVersion: 1 };
    const first = await updateSupplierEntry(created.entry._id, edit, state.context);
    expect(String(first.entry._id)).toBe(String(created.entry._id));
    expect(toApiString(first.account.debtBalance)).toBe('80');
    await updateSupplierEntry(created.entry._id, { ...edit, amount: '90', expectedAccountVersion: 2 }, state.context);
    expect(state.entries).toHaveLength(1);
    expect(state.entries[0].kind).toBe('DEBT');
    await deleteSupplierEntry(created.entry._id, { reason: 'حذف المعاملة', expectedAccountVersion: 3 }, state.context);
    expect(state.entries).toHaveLength(0);
    expect(toApiString(state.account.debtBalance)).toBe('0');
  });

  it('recalculates later balances after changing an earlier transaction', async () => {
    const state = buildContext();
    const first = await recordDebt(state.supplier._id, input('DEBT', '100'), state.context);
    await recordDebt(state.supplier._id, input('DEBT', '50', 1), state.context);
    await updateSupplierEntry(first.entry._id, { amount: '80', occurredOn: '2026-09-10', reason: 'تصحيح', expectedAccountVersion: 2 }, state.context);
    expect(state.entries.map((row) => toApiString(row.debtBalanceAfter))).toEqual(['80', '130']);
  });

  it('turns excess paid debt into receivable, and can edit it back', async () => {
    const drawerPort = { createSupplierSettlement: settlementPortMock() };
    const state = buildContext({ drawerPort });
    const debt = await recordDebt(state.supplier._id, input('DEBT', '100'), state.context);
    await payDebt(state.supplier._id, input('DEBT_PAYMENT', '100', 1), state.context);
    const edit = { amount: '60', occurredOn: '2026-09-10', reason: 'تصحيح', expectedAccountVersion: 2 };
    await updateSupplierEntry(debt.entry._id, edit, state.context);
    expect(toApiString(state.account.debtBalance)).toBe('0');
    expect(toApiString(state.account.receivableBalance)).toBe('40');
    await updateSupplierEntry(debt.entry._id, { ...edit, amount: '120', expectedAccountVersion: 3 }, state.context);
    expect(toApiString(state.account.debtBalance)).toBe('20');
    expect(toApiString(state.account.receivableBalance)).toBe('0');
    expect(drawerPort.createSupplierSettlement).toHaveBeenCalledTimes(1);
  });

  it('edits and deletes the original cash transaction without additional movements', async () => {
    const drawerPort = { createSupplierSettlement: settlementPortMock(), changeSupplierSettlement: vi.fn(async () => null) };
    const state = buildContext({ drawerPort });
    await recordDebt(state.supplier._id, input('DEBT', '100'), state.context);
    const payment = await payDebt(state.supplier._id, input('DEBT_PAYMENT', '30', 1), state.context);
    await updateSupplierEntry(payment.entry._id, { amount: '40', occurredOn: '2026-09-10', reason: 'تصحيح', expectedAccountVersion: 2 }, state.context);
    expect(drawerPort.changeSupplierSettlement).toHaveBeenLastCalledWith(expect.objectContaining({ entryId: payment.entry._id, amount: '40', deleting: false }), expect.anything());
    await deleteSupplierEntry(payment.entry._id, { reason: 'حذف الدفعة', expectedAccountVersion: 3 }, state.context);
    expect(drawerPort.changeSupplierSettlement).toHaveBeenLastCalledWith(expect.objectContaining({ entryId: payment.entry._id, deleting: true }), expect.anything());
    expect(drawerPort.createSupplierSettlement).toHaveBeenCalledTimes(1);
    expect(toApiString(state.account.debtBalance)).toBe('100');
    expect(state.entries).toHaveLength(1);
  });

  it('rejects an old account version without changing the entry', async () => {
    const state = buildContext();
    const debt = await recordDebt(state.supplier._id, input('DEBT', '50'), state.context);
    await expect(deleteSupplierEntry(debt.entry._id, { reason: 'حذف', expectedAccountVersion: 0 }, state.context)).rejects.toMatchObject({ code: 'SUPPLIER_ACCOUNT_VERSION_CONFLICT' });
    expect(state.entries).toHaveLength(1);
  });
});
describe('supplier normalization', () => {
  it('normalizes common Egyptian phone representations deterministically', () => {
    expect(normalizePhone('0100 123 4567')).toBe('+201001234567');
    expect(normalizePhone('+20 100 123 4567')).toBe('+201001234567');
  });
});

describe('supplier deletion events', () => {
  it.each([0, 1, 4])('does not reuse the latest event sequence at version %i', async (version) => {
    const state = buildContext();
    state.supplier.version = version;
    state.models.Supplier.findOne = () => chain(state.supplier);
    state.models.Supplier.deleteOne = vi.fn(async () => ({ deletedCount: 1 }));
    state.models.SupplierAccount.findOne = () => chain(state.account);
    state.models.SupplierAccount.deleteOne = vi.fn(async () => ({ deletedCount: 1 }));
    state.models.SupplierAccountEntry.countDocuments = () => chain(0);
    state.context.supplierDeleteModels = {};
    const used = new Set([version + 1]);
    state.context.outboxModel.create = vi.fn(async ([event]) => {
      if (used.has(event.sequence)) throw Object.assign(new Error('duplicate event'), { code: 11000 });
      used.add(event.sequence);
      return [event];
    });
    await expect(deleteSupplier(state.supplier._id, {
      expectedVersion: version, reason: 'حذف مورد غير مستخدم',
    }, state.context)).resolves.toMatchObject({ deleted: true });
    expect(used.has(version + 2)).toBe(true);
  });
});

describe('supplier entry idempotency', () => {
  it('replays a duplicate entry write for the same operation key', async () => {
    const opId = new mongoose.Types.ObjectId();
    const account = {
      _id: new mongoose.Types.ObjectId(),
      supplierId: new mongoose.Types.ObjectId(),
      version: 0,
      debtBalance: toDecimal128('0'),
      receivableBalance: toDecimal128('0'),
      save: vi.fn(async () => {
        account.version += 1;
      })
    };
    const supplier = { _id: account.supplierId, status: 'ACTIVE' };
    const stored = { _id: new mongoose.Types.ObjectId(), kind: 'DEBT', operationRequestId: opId };
    let creates = 0;
    const models = {
      Supplier: { findById: () => chain(supplier) },
      SupplierAccount: { findOne: () => ({ ...chain(account), lean: async () => account }) },
      SupplierAccountEntry: {
        create: async ([value]) => {
          creates += 1;
          if (creates > 1) throw Object.assign(new Error('duplicate'), { code: 11000 });
          return [{ ...value, _id: new mongoose.Types.ObjectId() }];
        },
        findOne: () => ({ lean: async () => stored })
      }
    };
    const base = {
      session: {},
      actorType: 'EMPLOYEE',
      actorId: new mongoose.Types.ObjectId(),
      requestId: 'request-1',
      operationRequestId: opId,
      models,
      auditModel: { create: async ([value]) => [value] },
      sequenceModel: { findOneAndUpdate: async () => ({ value: 1 }) },
      outboxModel: { create: async ([value]) => [value] }
    };
    const first = await recordDebt(
      supplier._id,
      { kind: 'DEBT', amount: '50', occurredOn: '2026-09-10', expectedAccountVersion: 0 },
      base
    );
    expect(first.entry.kind).toBe('DEBT');
    expect(toApiString(first.account.debtBalance)).toBe('50');
    const replay = await recordDebt(
      supplier._id,
      { kind: 'DEBT', amount: '50', occurredOn: '2026-09-10', expectedAccountVersion: 1 },
      base
    );
    expect(replay.replayed).toBe(true);
    expect(String(replay.entry._id)).toBe(String(stored._id));
    expect(creates).toBe(2);
  });
});
