import { add, compare, subtract, toDecimal128 } from '../../platform/database/decimal.js';
import { runInTransaction } from '../../platform/database/transaction.js';
import { ApiError } from '../../platform/http/api-error.js';
import { CashDrawerShift, CashDrawerTransaction } from './drawer.models.js';

export async function rebuildDrawerShift(shift, models, session) {
  const rows = await models.CashDrawerTransaction.find({ shiftId: shift._id }).sort({ sequenceNo: 1, _id: 1 }).session(session);
  let balance = shift.openingBalance, cashIn = '0', cashOut = '0';
  const writes = rows.map((row, index) => {
    if (row.direction === 'IN') {
      cashIn = add(cashIn, row.amount);
      balance = add(balance, row.amount);
    } else {
      cashOut = add(cashOut, row.amount);
      balance = subtract(balance, row.amount);
    }
    row.sequenceNo = index + 1;
    row.balanceAfter = toDecimal128(balance);
    return { updateOne: { filter: { _id: row._id }, update: { $set: { sequenceNo: row.sequenceNo, balanceAfter: row.balanceAfter } } } };
  });
  if (writes.length) await models.CashDrawerTransaction.bulkWrite(writes, { session, ordered: true });
  shift.totalCashIn = toDecimal128(cashIn);
  shift.totalCashOut = toDecimal128(cashOut);
  shift.netCashMovement = toDecimal128(subtract(balance, shift.openingBalance));
  shift.expectedClosingBalance = toDecimal128(balance);
  shift.transactionCount = rows.length;
  if (shift.status === 'CLOSED') {
    const difference = subtract(shift.actualClosingBalance, balance);
    shift.reconciliationDifference = toDecimal128(difference);
    shift.reconciliationStatus = compare(difference, '0') === 0 ? 'MATCHED' : compare(difference, '0') < 0 ? 'SHORTAGE' : 'SURPLUS';
    shift.shortageAmount = toDecimal128(compare(difference, '0') < 0 ? subtract('0', difference) : '0');
    shift.surplusAmount = toDecimal128(compare(difference, '0') > 0 ? difference : '0');
  }
  shift.markModified('expectedClosingBalance');
  await shift.save({ session });
  return rows;
}

export async function changeSupplierSettlement(input, context = {}) {
  return runInTransaction(async (tx) => {
    const models = context.drawerModels ?? { CashDrawerShift, CashDrawerTransaction };
    const transaction = await models.CashDrawerTransaction.findOne({
      ...(input.transactionId ? { _id: input.transactionId } : {}),
      sourceType: 'SUPPLIER_ACCOUNT_ENTRY', sourceId: String(input.entryId),
    }).session(tx.session);
    if (!transaction) throw new ApiError({ code: 'SUPPLIER_CASH_TRANSACTION_NOT_FOUND', status: 409, messageAr: 'حركة الدرج المرتبطة بالمعاملة غير موجودة' });
    const shift = await models.CashDrawerShift.findById(transaction.shiftId).session(tx.session);
    if (!shift) throw new ApiError({ code: 'DRAWER_SHIFT_NOT_FOUND', status: 409, messageAr: 'وردية حركة المورد غير موجودة' });
    if (input.deleting) {
      await models.CashDrawerTransaction.deleteOne({ _id: transaction._id }, { session: tx.session });
    } else {
      transaction.amount = toDecimal128(input.amount);
      await transaction.save({ session: tx.session });
    }
    const rows = await rebuildDrawerShift(shift, models, tx.session);
    return input.deleting ? null : { transaction: rows.find((row) => String(row._id) === String(transaction._id)), shift };
  }, context, context.transactionOptions);
}
