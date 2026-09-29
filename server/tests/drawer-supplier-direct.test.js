import { describe, it, expect, vi } from 'vitest';
import { changeSupplierSettlement } from '../src/modules/drawer/drawer-supplier.service.js';
import { toDecimal128, toApiString } from '../src/platform/database/decimal.js';

function fixture(status = 'OPEN') {
  const shift = { _id: 'shift', status, openingBalance: toDecimal128('500'), actualClosingBalance: toDecimal128('450'), markModified: vi.fn(), save: vi.fn() };
  const rows = [
    { _id: 'payment', shiftId: 'shift', sequenceNo: 1, direction: 'OUT', amount: toDecimal128('100'), sourceType: 'SUPPLIER_ACCOUNT_ENTRY', sourceId: 'entry', save: vi.fn() },
    { _id: 'other', shiftId: 'shift', sequenceNo: 2, direction: 'IN', amount: toDecimal128('50') },
  ];
  const chain = (value) => ({ session: async () => value, sort: () => chain(value) });
  const models = {
    CashDrawerShift: { findById: () => chain(shift) },
    CashDrawerTransaction: {
      findOne: (filter) => chain(rows.find((row) => row.sourceId === filter.sourceId && row.sourceType === filter.sourceType && (!filter._id || row._id === filter._id))),
      find: () => chain(rows), bulkWrite: vi.fn(), create: vi.fn(),
      deleteOne: async ({ _id }) => rows.splice(rows.findIndex((row) => row._id === _id), 1),
    },
  };
  return { shift, rows, models, context: { session: {}, drawerModels: models } };
}

describe('supplier cash transactions change directly', () => {
  it('keeps the original ID and recalculates subsequent balances, then removes the row', async () => {
    const f = fixture();
    const result = await changeSupplierSettlement({ entryId: 'entry', transactionId: 'payment', amount: '80' }, f.context);
    expect(result.transaction._id).toBe('payment');
    expect(f.rows.map((row) => toApiString(row.balanceAfter))).toEqual(['420', '470']);
    expect(toApiString(f.shift.totalCashOut)).toBe('80');
    expect(f.rows).toHaveLength(2);
    await changeSupplierSettlement({ entryId: 'entry', deleting: true }, f.context);
    expect(f.rows.map((row) => row._id)).toEqual(['other']);
    expect(f.rows[0].sequenceNo).toBe(1);
    expect(toApiString(f.shift.expectedClosingBalance)).toBe('550');
    expect(toApiString(f.shift.totalCashOut)).toBe('0');
    expect(f.shift.transactionCount).toBe(1);
    expect(f.models.CashDrawerTransaction.create).not.toHaveBeenCalled();
  });
  it('updates a closed original shift and its reconciliation without opening another drawer', async () => {
    const f = fixture('CLOSED');
    await changeSupplierSettlement({ entryId: 'entry', amount: '80' }, f.context);
    expect(f.shift.status).toBe('CLOSED');
    expect(toApiString(f.shift.actualClosingBalance)).toBe('450');
    expect(toApiString(f.shift.reconciliationDifference)).toBe('-20');
    expect(f.shift.reconciliationStatus).toBe('SHORTAGE');
  });
  it('does not modify an unrelated movement when a link is missing', async () => {
    const f = fixture();
    await expect(changeSupplierSettlement({ entryId: 'wrong', transactionId: 'payment', deleting: true }, f.context)).rejects.toMatchObject({ code: 'SUPPLIER_CASH_TRANSACTION_NOT_FOUND' });
    expect(f.rows).toHaveLength(2);
    expect(f.shift.save).not.toHaveBeenCalled();
  });
});
