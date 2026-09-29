import { writeAudit } from '../../platform/audit/audit-writer.js';
import { add, subtract, toApiString, toDecimal128 } from '../../platform/database/decimal.js';
import { runInTransaction } from '../../platform/database/transaction.js';
import { enqueueDomainEvent } from '../../platform/events/outbox-writer.js';
import { ApiError } from '../../platform/http/api-error.js';
import { SupplierAccount, SupplierAccountEntry } from './supplier.models.js';
import { applyEntryChange, displayBalances, entryEffect } from './supplier-balances.js';
import { changeSupplierCashEffect } from './drawer-supplier.port.js';

async function refreshSnapshots(models, account, context) {
  const rows = await models.SupplierAccountEntry.find({ supplierId: account.supplierId })
    .sort({ sequenceNo: 1, _id: 1 }).session(context.session);
  let debt = account.debtLedgerBalance;
  let receivable = account.receivableLedgerBalance;
  // Preserve any opening balance from historical data outside the manual entries.
  for (const row of rows) {
    const effect = entryEffect(row.kind, row.amount);
    debt = subtract(debt, effect.debt);
    receivable = subtract(receivable, effect.receivable);
  }
  const changes = [];
  for (const row of rows) {
    const effect = entryEffect(row.kind, row.amount);
    debt = add(debt, effect.debt);
    receivable = add(receivable, effect.receivable);
    const visible = displayBalances(debt, receivable);
    const balances = { debtBalanceAfter: toDecimal128(visible.debt), receivableBalanceAfter: toDecimal128(visible.receivable) };
    Object.assign(row, balances);
    changes.push({ updateOne: { filter: { _id: row._id }, update: { $set: balances } } });
  }
  if (changes.length) await models.SupplierAccountEntry.bulkWrite(changes, { session: context.session, ordered: true });
  return rows;
}

async function changeEntry(entryId, input, deleting, context = {}) {
  return runInTransaction(async (tx) => {
    const ctx = { ...context, ...tx };
    const models = context.models ?? { SupplierAccount, SupplierAccountEntry };
    const entry = await models.SupplierAccountEntry.findById(entryId).session(tx.session);
    if (!entry) {
      throw new ApiError({ code: 'SUPPLIER_ENTRY_NOT_FOUND', status: 404, messageAr: 'المعاملة غير موجودة أو تم حذفها' });
    }
    const account = await models.SupplierAccount.findOne({ supplierId: entry.supplierId, version: input.expectedAccountVersion }).session(tx.session);
    if (!account) throw new ApiError({ code: 'SUPPLIER_ACCOUNT_VERSION_CONFLICT', status: 409, messageAr: 'حساب المورد تغير، أعد تحميل الصفحة' });
    const before = { kind: entry.kind, amount: toApiString(entry.amount), occurredOn: entry.occurredOn, notes: entry.notes ?? '' };
    const delta = subtract(deleting ? '0' : input.amount, entry.amount);
    applyEntryChange(account, entry.kind, delta);
    account.markModified('debtBalance');
    await account.save({ session: tx.session });
    let drawerTransaction = null;
    if (['DEBT_PAYMENT', 'RECEIVABLE_COLLECTION'].includes(entry.kind)) {
      drawerTransaction = await changeSupplierCashEffect({
        entryId: entry._id, supplierId: entry.supplierId, transactionId: entry.drawerTransactionId,
        amount: input.amount, deleting, reason: input.reason,
      }, ctx);
    }
    if (deleting) {
      await models.SupplierAccountEntry.deleteOne({ _id: entry._id }, { session: tx.session });
    } else {
      entry.amount = toDecimal128(input.amount);
      entry.occurredOn = input.occurredOn;
      entry.notes = input.notes ?? '';
      entry.updatedAt = new Date();
      entry.updatedBy = context.actorId;
      await entry.save({ session: tx.session });
    }
    const rows = await refreshSnapshots(models, account, ctx);
    const saved = rows.find((row) => String(row._id) === String(entryId));
    await writeAudit({
      eventType: deleting ? 'SUPPLIER_ACCOUNT_ENTRY_DELETED' : 'SUPPLIER_ACCOUNT_ENTRY_UPDATED',
      category: 'FINANCIAL', module: 'suppliers', action: deleting ? 'DELETED' : 'UPDATED',
      actor: { type: context.actorType, id: context.actorId }, entity: { type: 'SupplierAccountEntry', id: entry._id },
      metadataSafe: { before, ...(deleting ? {} : { after: { amount: input.amount, occurredOn: input.occurredOn, notes: input.notes ?? '' } }), reason: input.reason },
      result: 'SUCCESS', severity: 'INFO', requestId: context.requestId,
    }, ctx);
    await enqueueDomainEvent({
      aggregateType: 'SupplierAccount', aggregateId: String(account._id), eventType: 'supplier.account-updated',
      payload: { supplierId: String(entry.supplierId), debtBalance: toApiString(account.debtBalance), receivableBalance: toApiString(account.receivableBalance) },
      sequence: account.version,
    }, ctx);
    return { ...(deleting ? { deleted: true, entryId: String(entry._id) } : { entry: saved }), account, drawerTransaction };
  }, context, context.transactionOptions);
}

export const deleteSupplierEntry = (entryId, input, context) => changeEntry(entryId, input, true, context);
export const updateSupplierEntry = (entryId, input, context) => changeEntry(entryId, input, false, context);
