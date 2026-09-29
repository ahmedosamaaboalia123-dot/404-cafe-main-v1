import { ApiError } from '../../platform/http/api-error.js';
import { CashDrawerShift, CashDrawerTransaction } from './drawer.models.js';
import { createCashTransaction } from './drawer.service.js';
const defaults = { CashDrawerShift, CashDrawerTransaction };
async function current(context) {
  const m = context.drawerModels ?? defaults;
  const shift = await m.CashDrawerShift.findOne({
    scopeType: 'EMPLOYEE',
    scopeId: context.actorId,
    status: 'OPEN'
  }).session(context.session);
  if (!shift)
    throw new ApiError({
      code: 'OPEN_DRAWER_REQUIRED',
      status: 409,
      messageAr: 'يجب فتح الدرج أولًا'
    });
  return shift;
}
export async function createSupplierSettlement(input, context = {}) {
  const shift = await current(context);
  return createCashTransaction(
    {
      shiftId: shift._id,
      direction: input.direction,
      amount: input.amount,
      accountingClass:
        input.direction === 'IN' ? 'SUPPLIER_RECEIVABLE_COLLECTION' : 'SUPPLIER_DEBT_PAYMENT',
      description: 'تسوية يدوية لحساب مورد',
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      expectedVersion: shift.version,
      snapshots: { supplierId: String(input.supplierId) }
    },
    context
  );
}
export async function hasOpenShiftForEmployee(employeeId, context = {}) {
  const m = context.drawerModels ?? defaults;
  return Boolean(
    await m.CashDrawerShift.exists({
      scopeType: 'EMPLOYEE',
      scopeId: employeeId,
      status: { $in: ['OPEN', 'CLOSING'] }
    })
  );
}
export async function getOpenShiftWarnings(context = {}) {
  const m = context.drawerModels ?? defaults;
  const threshold = new Date((context.now ?? new Date()).getTime() - 12 * 60 * 60 * 1000);
  const shifts = await m.CashDrawerShift.find({ status: 'OPEN', openedAt: { $lte: threshold } })
    .sort({ openedAt: 1, _id: 1 })
    .limit(100)
    .lean();
  const now = context.now ?? new Date();
  return {
    count: shifts.length,
    sourceVersion: shifts.map((shift) => `${shift._id}:${shift.version ?? 0}`).join('|'),
    items: shifts.map((shift) => ({
      id: `OPEN_SHIFT_LONG:${shift._id}`,
      type: 'OPEN_SHIFT_LONG',
      severity: 'WARNING',
      shift: { id: String(shift._id), shiftNo: shift.shiftNo },
      currentValue: Math.floor((now - new Date(shift.openedAt)) / 3600000),
      thresholdValue: 12,
      messageAr: `الوردية ${shift.shiftNo} مفتوحة منذ أكثر من 12 ساعة`,
      link: `/drawer/shifts/${shift._id}`
    }))
  };
}
export async function createSourceCashTransaction(input, context = {}) {
  const shift = await current(context);
  return createCashTransaction(
    {
      shiftId: shift._id,
      direction: input.direction,
      amount: input.amount,
      accountingClass: input.accountingClass,
      description: input.description,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      expectedVersion: shift.version,
      snapshots: input.snapshots
    },
    context
  );
}

export { changeSupplierSettlement } from './drawer-supplier.service.js';
