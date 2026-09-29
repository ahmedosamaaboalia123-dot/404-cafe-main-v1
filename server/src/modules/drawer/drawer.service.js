import { DateTime } from 'luxon';
import {
  add,
  compare,
  isPositive,
  subtract,
  toApiString,
  toDecimal128
} from '../../platform/database/decimal.js';
import { nextSequence } from '../../platform/database/sequence.js';
import { runInTransaction } from '../../platform/database/transaction.js';
import { ApiError } from '../../platform/http/api-error.js';
import { CashDrawerShift, CashDrawerTransaction } from './drawer.models.js';
const defaults = { CashDrawerShift, CashDrawerTransaction };
export const shiftDto = (s) => ({
  id: String(s._id),
  shiftNo: s.shiftNo,
  drawerKey: s.drawerKey,
  scopeType: s.scopeType,
  scopeId: String(s.scopeId),
  status: s.status,
  currency: s.currency,
  openingBalance: toApiString(s.openingBalance),
  totalCashIn: toApiString(s.totalCashIn),
  totalCashOut: toApiString(s.totalCashOut),
  netCashMovement: toApiString(s.netCashMovement),
  expectedClosingBalance: toApiString(s.expectedClosingBalance),
  actualClosingBalance: s.actualClosingBalance ? toApiString(s.actualClosingBalance) : null,
  closingVsOpeningDifference: s.closingVsOpeningDifference
    ? toApiString(s.closingVsOpeningDifference)
    : null,
  reconciliationDifference: s.reconciliationDifference
    ? toApiString(s.reconciliationDifference)
    : null,
  reconciliationStatus: s.reconciliationStatus,
  shortageAmount: s.shortageAmount ? toApiString(s.shortageAmount) : '0',
  surplusAmount: s.surplusAmount ? toApiString(s.surplusAmount) : '0',
  openedAt: s.openedAt,
  closedAt: s.closedAt ?? null,
  nextOpenShiftWarningAt: s.nextOpenShiftWarningAt,
  version: s.version ?? 0
});
export const transactionDto = (t) => ({
  id: String(t._id),
  shiftId: String(t.shiftId),
  sequenceNo: t.sequenceNo,
  direction: t.direction,
  amount: toApiString(t.amount),
  currency: t.currency,
  balanceAfter: toApiString(t.balanceAfter),
  sourceType: t.sourceType,
  sourceId: t.sourceId,
  accountingClass: t.accountingClass,
  description: t.description,
  recordedAt: t.recordedAt,
  recordedBy: t.recordedBy ? String(t.recordedBy) : null
});
export async function openShift(input, context = {}) {
  return runInTransaction(
    async (tx) => {
      const m = context.drawerModels ?? defaults;
      if (
        await m.CashDrawerShift.exists({
          scopeType: input.scopeType ?? 'EMPLOYEE',
          scopeId: input.scopeId ?? context.actorId,
          status: { $in: ['OPEN', 'CLOSING'] }
        }).session(tx.session)
      )
        throw new ApiError({
          code: 'DRAWER_SHIFT_ALREADY_OPEN',
          status: 409,
          messageAr: 'يوجد درج مفتوح بالفعل'
        });
      const seq = await nextSequence('cash-drawer-shift', { ...context, ...tx });
      const opening = toDecimal128(input.openingBalance);
      const now = context.now ?? new Date();
      const [shift] = await m.CashDrawerShift.create(
        [
          {
            shiftNo: `SH-${String(seq).padStart(6, '0')}`,
            drawerKey: input.drawerKey ?? `EMPLOYEE:${input.scopeId ?? context.actorId}`,
            scopeType: input.scopeType ?? 'EMPLOYEE',
            scopeId: input.scopeId ?? context.actorId,
            locationId: input.locationId,
            openingBalance: opening,
            totalCashIn: toDecimal128('0'),
            totalCashOut: toDecimal128('0'),
            netCashMovement: toDecimal128('0'),
            expectedClosingBalance: opening,
            openingNotes: input.notes,
            openedAt: now,
            openedBy: context.actorId,
            nextOpenShiftWarningAt: DateTime.fromJSDate(now).plus({ hours: 12 }).toJSDate()
          }
        ],
        { session: tx.session }
      );
      return shift;
    },
    context,
    context.transactionOptions
  );
}
export async function createCashTransaction(input, context = {}) {
  // Defense in depth: route validation already requires positive amounts, but
  // this service is also reachable through internal ports.
  if (!isPositive(input.amount))
    throw new ApiError({
      code: 'DRAWER_INVALID_AMOUNT',
      status: 422,
      messageAr: 'مبلغ الحركة يجب أن يكون موجباً'
    });
  // Self-contained atomicity: callers inside a transaction pass their session
  // (reused automatically); direct callers get their own transaction so the
  // shift update and the transaction record can never split.
  if (!context.session)
    return runInTransaction(
      (tx) => createCashTransaction(input, { ...context, ...tx }),
      context,
      context.transactionOptions
    );
  const m = context.drawerModels ?? defaults;
  const shift = await m.CashDrawerShift.findOne({
    _id: input.shiftId,
    status: 'OPEN',
    version: input.expectedVersion
  }).session(context.session);
  if (!shift)
    throw new ApiError({
      code: 'DRAWER_SHIFT_VERSION_CONFLICT',
      status: 409,
      messageAr: 'الدرج مغلق أو تغير رصيده'
    });
  if (input.direction === 'OUT' && compare(input.amount, shift.expectedClosingBalance) > 0)
    throw new ApiError({
      code: 'DRAWER_INSUFFICIENT_CASH',
      status: 409,
      messageAr: 'رصيد الدرج غير كافٍ'
    });
  const amount = toDecimal128(input.amount);
  const inbound = input.direction === 'IN';
  const nextCashIn = inbound ? add(shift.totalCashIn, amount) : shift.totalCashIn;
  const nextCashOut = inbound ? shift.totalCashOut : add(shift.totalCashOut, amount);
  shift.totalCashIn = toDecimal128(nextCashIn);
  shift.totalCashOut = toDecimal128(nextCashOut);
  // The balance follows the physical movement, so it is derived from the entry's
  // own direction and not from the two tallies above.
  shift.expectedClosingBalance = toDecimal128(
    inbound ? add(shift.expectedClosingBalance, amount) : subtract(shift.expectedClosingBalance, amount)
  );
  shift.netCashMovement = toDecimal128(subtract(shift.expectedClosingBalance, shift.openingBalance));
  const sequenceNo = (shift.transactionCount ?? 0) + 1;
  shift.transactionCount = sequenceNo;
  await shift.save({ session: context.session });
  const [transaction] = await m.CashDrawerTransaction.create(
    [
      {
        shiftId: shift._id,
        sequenceNo,
        direction: input.direction,
        amount,
        currency: shift.currency,
        balanceAfter: shift.expectedClosingBalance,
        sourceType: input.sourceType,
        sourceId: String(input.sourceId),
        accountingClass: input.accountingClass,
        description: input.description,
        recordedBy: context.actorId,
        snapshots: input.snapshots
      }
    ],
    { session: context.session }
  );
  return { transaction, shift };
}
export async function createManualMovement(shiftId, input, context = {}) {
  return runInTransaction(
    (tx) =>
      createCashTransaction(
        {
          shiftId,
          direction: input.direction,
          amount: input.amount,
          accountingClass: input.accountingClass,
          description: input.description,
          sourceType: 'MANUAL',
          sourceId: context.operationRequestId ?? new Date().getTime(),
          expectedVersion: input.expectedVersion
        },
        { ...context, ...tx }
      ),
    context,
    context.transactionOptions
  );
}
export async function closeShift(id, input, context = {}) {
  return runInTransaction(
    async (tx) => {
      const m = context.drawerModels ?? defaults;
      const shift = await m.CashDrawerShift.findOne({
        _id: id,
        status: 'OPEN',
        version: input.expectedVersion
      }).session(tx.session);
      if (!shift)
        throw new ApiError({
          code: 'DRAWER_CLOSE_CONFLICT',
          status: 409,
          messageAr: 'الدرج تغير أو تم إغلاقه'
        });
      const rows = await m.CashDrawerTransaction.find({ shiftId: id }).session(tx.session);
      const sumBy = (predicate) =>
        rows.filter(predicate).reduce((total, r) => add(total, r.amount), '0'),
        cashIn = sumBy((r) => r.direction === 'IN'),
        cashOut = sumBy((r) => r.direction === 'OUT'),
        expectedBalance = add(shift.openingBalance, subtract(cashIn, cashOut));
      if (
        compare(cashIn, shift.totalCashIn) !== 0 ||
        compare(cashOut, shift.totalCashOut) !== 0 ||
        compare(expectedBalance, shift.expectedClosingBalance) !== 0
      )
        throw new ApiError({
          code: 'DRAWER_LEDGER_MISMATCH',
          status: 409,
          messageAr: 'تعذر الإغلاق بسبب اختلاف سجل الحركات'
        });
      const actual = toDecimal128(input.actualClosingBalance),
        difference = subtract(actual, shift.expectedClosingBalance);
      shift.status = 'CLOSED';
      shift.actualClosingBalance = actual;
      shift.closingVsOpeningDifference = toDecimal128(subtract(actual, shift.openingBalance));
      shift.reconciliationDifference = toDecimal128(difference);
      shift.reconciliationStatus =
        compare(difference, '0') === 0
          ? 'MATCHED'
          : compare(difference, '0') < 0
            ? 'SHORTAGE'
            : 'SURPLUS';
      shift.shortageAmount = toDecimal128(
        compare(difference, '0') < 0 ? subtract('0', difference) : '0'
      );
      shift.surplusAmount = toDecimal128(compare(difference, '0') > 0 ? difference : '0');
      shift.closingNotes = input.closingNotes;
      shift.differenceReason = input.differenceReason;
      shift.closedAt = context.now ?? new Date();
      shift.closedBy = context.actorId;
      await shift.save({ session: tx.session });
      return shift;
    },
    context,
    context.transactionOptions
  );
}

