import { writeAudit } from '../../platform/audit/audit-writer.js';
import {
  add,
  compare,
  subtract,
  toApiString,
  toDecimal128
} from '../../platform/database/decimal.js';
import { runInTransaction } from '../../platform/database/transaction.js';
import { enqueueDomainEvent } from '../../platform/events/outbox-writer.js';
import { ApiError } from '../../platform/http/api-error.js';
import { normalizeName } from '../../shared/utils/normalize-name.js';
import { normalizePhone } from '../../shared/utils/normalize-phone.js';
import mongoose from 'mongoose';
import { createSupplierCashEffect } from './drawer-supplier.port.js';
import { applyEntryChange } from './supplier-balances.js';
import { Supplier, SupplierAccount, SupplierAccountEntry } from './supplier.models.js';
import { RawMaterial, RawMaterialBatch } from '../inventory/inventory.models.js';
import { PurchaseItem, SupplierPurchaseInvoice } from '../purchases/purchase.models.js';
import { PurchaseReturnItem } from '../purchase-returns/purchase-return.models.js';
import { CashDrawerTransaction } from '../drawer/drawer.models.js';

const defaults = { Supplier, SupplierAccount, SupplierAccountEntry };
const audit = (context, action, type, id, metadataSafe = {}) => ({
  eventType: `SUPPLIER_${action}`,
  category: 'FINANCIAL',
  module: 'suppliers',
  action,
  actor: { type: context.actorType, id: context.actorId },
  entity: { type, id },
  metadataSafe,
  result: 'SUCCESS',
  severity: 'INFO',
  requestId: context.requestId
});

export async function createSupplier(input, context = {}) {
  return runInTransaction(
    async (tx) => {
      const models = context.models ?? defaults;
      const [supplier] = await models.Supplier.create(
        [
          {
            ...input,
            normalizedName: normalizeName(input.name),
            phoneNormalized: normalizePhone(input.phone),
            createdBy: context.actorId
          }
        ],
        { session: tx.session }
      );
      const [account] = await models.SupplierAccount.create(
        [
          {
            supplierId: supplier._id,
            currency: context.currency ?? 'EGP',
            debtBalance: toDecimal128('0'),
            receivableBalance: toDecimal128('0')
          }
        ],
        { session: tx.session }
      );
      await writeAudit(audit(context, 'CREATED', 'Supplier', supplier._id), { ...context, ...tx });
      await enqueueDomainEvent(
        {
          aggregateType: 'Supplier',
          aggregateId: String(supplier._id),
          eventType: 'supplier.created',
          payload: { supplierId: String(supplier._id) },
          sequence: 1
        },
        { ...context, ...tx }
      );
      return { supplier, account };
    },
    context,
    context.transactionOptions
  );
}

export async function updateSupplier(id, patch, context = {}) {
  return runInTransaction(
    async (tx) => {
      const models = context.models ?? defaults;
      const supplier = await models.Supplier.findOne({
        _id: id,
        version: patch.expectedVersion
      }).session(tx.session);
      if (!supplier)
        throw new ApiError({
          code: 'SUPPLIER_VERSION_CONFLICT',
          status: 409,
          messageAr: 'المورد غير موجود أو تم تعديله'
        });
      for (const key of ['name', 'contactPerson', 'phone', 'city'])
        if (patch[key] !== undefined) supplier[key] = patch[key];
      if (patch.name) supplier.normalizedName = normalizeName(patch.name);
      if (patch.phone) supplier.phoneNormalized = normalizePhone(patch.phone);
      supplier.updatedBy = context.actorId;
      // Force a versioned write even when the same employee resubmits unchanged fields.
      supplier.markModified('updatedBy');
      await supplier.save({ session: tx.session });
      await writeAudit(audit(context, 'UPDATED', 'Supplier', supplier._id), { ...context, ...tx });
      await enqueueDomainEvent(
        {
          aggregateType: 'Supplier',
          aggregateId: String(supplier._id),
          eventType: 'supplier.updated',
          payload: { supplierId: String(supplier._id) },
          sequence: supplier.version + 1
        },
        { ...context, ...tx }
      );
      return { supplier };
    },
    context,
    context.transactionOptions
  );
}

export async function assertSupplierExists(id, context = {}) {
  const model = context.models?.Supplier ?? Supplier;
  const supplier = await model.findById(id).session(context.session);
  if (!supplier)
    throw new ApiError({ code: 'SUPPLIER_NOT_FOUND', status: 404, messageAr: 'المورد غير موجود' });
  return supplier;
}
export async function getSupplierSnapshot(id, context = {}) {
  const supplier = await assertSupplierExists(id, context);
  return Object.freeze({
    id: String(supplier._id),
    name: supplier.name,
    phone: supplier.phone,
    city: supplier.city
  });
}

export async function deleteSupplier(id, input, context = {}) {
  return runInTransaction(
    async (tx) => {
      const models = context.models ?? defaults;
      const supplier = await models.Supplier.findOne({ _id: id, version: input.expectedVersion }).session(tx.session);
      if (!supplier)
        throw new ApiError({ code: 'SUPPLIER_VERSION_CONFLICT', status: 409, messageAr: 'المورد غير موجود أو تم تعديله' });
      const account = await models.SupplierAccount.findOne({ supplierId: id }).session(tx.session);
      if (!account)
        throw new ApiError({ code: 'SUPPLIER_ACCOUNT_NOT_FOUND', status: 404, messageAr: 'حساب المورد غير موجود' });
      const oid = supplier._id;
      const linked = context.supplierDeleteModels ?? {
        RawMaterial,
        RawMaterialBatch,
        PurchaseItem,
        SupplierPurchaseInvoice,
        PurchaseReturnItem,
        CashDrawerTransaction
      };
      const count = async (model, query) => model ? model.countDocuments(query).session(tx.session) : 0;
      const [entries, materials, batches, purchaseItems, invoices, returns, drawerTransactions] = await Promise.all([
        count(models.SupplierAccountEntry, { supplierId: oid }),
        count(linked.RawMaterial, { supplierId: oid }),
        count(linked.RawMaterialBatch, { supplierId: oid }),
        count(linked.PurchaseItem, { supplierId: oid }),
        count(linked.SupplierPurchaseInvoice, { supplierId: oid }),
        count(linked.PurchaseReturnItem, { 'supplierSnapshot.id': String(oid) }),
        count(linked.CashDrawerTransaction, { 'snapshots.supplierId': String(oid) })
      ]);
      const blockers = {
        ...(compare(account.debtBalance, '0') !== 0 ? { debtBalance: toApiString(account.debtBalance) } : {}),
        ...(compare(account.receivableBalance, '0') !== 0 ? { receivableBalance: toApiString(account.receivableBalance) } : {}),
        ...(entries ? { entries } : {}), ...(materials ? { materials } : {}), ...(batches ? { batches } : {}),
        ...(purchaseItems ? { purchaseItems } : {}), ...(invoices ? { invoices } : {}),
        ...(returns ? { returns } : {}), ...(drawerTransactions ? { drawerTransactions } : {})
      };
      if (Object.keys(blockers).length)
        throw new ApiError({ code: 'SUPPLIER_DELETE_BLOCKED', status: 409, messageAr: 'لا يمكن حذف المورد لوجود بيانات مرتبطة به', details: { blockers } });
      const snapshot = { name: supplier.name, phone: supplier.phone, city: supplier.city, reason: input.reason };
      await models.SupplierAccount.deleteOne({ _id: account._id }, { session: tx.session });
      await models.Supplier.deleteOne({ _id: supplier._id }, { session: tx.session });
      await writeAudit(audit(context, 'DELETED', 'Supplier', supplier._id, snapshot), { ...context, ...tx });
      await enqueueDomainEvent({ aggregateType: 'Supplier', aggregateId: String(supplier._id), eventType: 'supplier.deleted', payload: { supplierId: String(supplier._id), ...snapshot }, sequence: supplier.version + 2 }, { ...context, ...tx });
      return { deleted: true, supplierId: String(supplier._id) };
    },
    context,
    context.transactionOptions
  );
}

function balancesFor(kind, amount, account) {
  const debt = account.debtBalance;
  const receivable = account.receivableBalance;
  if (kind === 'DEBT') return { debt: add(debt, amount), receivable };
  if (kind === 'RECEIVABLE') return { debt, receivable: add(receivable, amount) };
  if (kind === 'DEBT_PAYMENT') {
    if (compare(amount, debt) > 0)
      throw new ApiError({
        code: 'PAYMENT_EXCEEDS_DEBT',
        status: 409,
        messageAr: 'الدفعة أكبر من رصيد الدين'
      });
    return { debt: subtract(debt, amount), receivable };
  }
  if (compare(amount, receivable) > 0)
    throw new ApiError({
      code: 'COLLECTION_EXCEEDS_RECEIVABLE',
      status: 409,
      messageAr: 'المبلغ أكبر من رصيد المستحقات'
    });
  return { debt, receivable: subtract(receivable, amount) };
}

async function recordEntry(supplierId, input, context) {
  try {
    return await runInTransaction(
    async (tx) => {
      const models = context.models ?? defaults;
      const supplier = await models.Supplier.findById(supplierId).session(tx.session);
      if (!supplier)
        throw new ApiError({
          code: 'SUPPLIER_NOT_FOUND',
          status: 404,
          messageAr: 'المورد غير موجود'
        });
      const account = await models.SupplierAccount.findOne({
        supplierId,
        version: input.expectedAccountVersion
      }).session(tx.session);
      if (!account)
        throw new ApiError({
          code: 'SUPPLIER_ACCOUNT_VERSION_CONFLICT',
          status: 409,
          messageAr: 'حساب المورد تغير، أعد تحميل الصفحة'
        });
      balancesFor(input.kind, input.amount, account);
      applyEntryChange(account, input.kind, input.amount);
      await account.save({ session: tx.session });
      const entryId = new mongoose.Types.ObjectId();
      let drawerTransaction = null;
      if (['DEBT_PAYMENT', 'RECEIVABLE_COLLECTION'].includes(input.kind)) {
        drawerTransaction = await createSupplierCashEffect(
          { kind: input.kind, amount: toApiString(input.amount), supplierId, entryId },
          { ...context, ...tx }
        );
      }
      const [entry] = await models.SupplierAccountEntry.create(
        [
          {
            _id: entryId,
            supplierId,
            sequenceNo: account.version,
            kind: input.kind,
            amount: toDecimal128(input.amount),
            occurredOn: input.occurredOn,
            recordedAt: new Date(),
            recordedBy: context.actorId,
            notes: input.notes,
            debtBalanceAfter: account.debtBalance,
            receivableBalanceAfter: account.receivableBalance,
            origin: 'MANUAL',
            operationRequestId: context.operationRequestId,
            drawerTransactionId: drawerTransaction?.transaction?._id ?? undefined
          }
        ],
        { session: tx.session }
      );
      await writeAudit(
        audit(context, `ACCOUNT_${input.kind}`, 'SupplierAccountEntry', entry._id, {
          amount: toApiString(input.amount),
          occurredOn: input.occurredOn
        }),
        { ...context, ...tx }
      );
      await enqueueDomainEvent(
        {
          aggregateType: 'SupplierAccount',
          aggregateId: String(account._id),
          eventType: 'supplier.account-updated',
          payload: {
            supplierId: String(supplierId),
            debtBalance: toApiString(account.debtBalance),
            receivableBalance: toApiString(account.receivableBalance)
          },
          sequence: account.version
        },
        { ...context, ...tx }
      );
      return { entry, account, drawerTransaction };
      },
      context,
      context.transactionOptions
    );
  } catch (error) {
    if (error?.code !== 11000 || !context.operationRequestId) throw error;
    const models = context.models ?? defaults;
    const replayed = await models.SupplierAccountEntry.findOne({
      operationRequestId: context.operationRequestId
    }).lean();
    if (!replayed)
      throw new ApiError({
        code: 'ENTRY_WRITE_CONFLICT',
        status: 409,
        messageAr: 'تعارض في قيد المورد، أعد تحميل الصفحة'
      });
    const account = await models.SupplierAccount.findOne({ supplierId }).lean();
    return { entry: replayed, account, replayed: true };
  }
}
export const recordDebt = (supplierId, input, context) =>
  recordEntry(supplierId, { ...input, kind: 'DEBT' }, context);
export const recordReceivable = (supplierId, input, context) =>
  recordEntry(supplierId, { ...input, kind: 'RECEIVABLE' }, context);
export const payDebt = (supplierId, input, context) =>
  recordEntry(supplierId, { ...input, kind: 'DEBT_PAYMENT' }, context);
export const collectReceivable = (supplierId, input, context) =>
  recordEntry(supplierId, { ...input, kind: 'RECEIVABLE_COLLECTION' }, context);
export const createSupplierAccountEntry = (supplierId, input, context) =>
  recordEntry(supplierId, input, context);

export { deleteSupplierEntry, updateSupplierEntry } from './supplier-entry.service.js';
