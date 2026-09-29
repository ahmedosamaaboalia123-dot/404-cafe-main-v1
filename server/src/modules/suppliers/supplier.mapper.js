import { toApiString } from '../../platform/database/decimal.js';
export const toSupplierDto = (supplier) => ({
  id: String(supplier._id),
  name: supplier.name,
  contactPerson: supplier.contactPerson,
  phone: supplier.phone,
  city: supplier.city,
  createdAt: supplier.createdAt,
  updatedAt: supplier.updatedAt,
  version: supplier.version ?? 0
});
export const toAccountDto = (account) => ({
  supplierId: String(account.supplierId),
  currency: account.currency,
  debtBalance: toApiString(account.debtBalance),
  receivableBalance: toApiString(account.receivableBalance),
  version: account.version ?? 0
});
export const toEntryDto = (entry) => ({
  id: String(entry._id),
  supplierId: String(entry.supplierId),
  sequenceNo: entry.sequenceNo,
  kind: entry.kind,
  amount: toApiString(entry.amount),
  occurredOn: entry.occurredOn,
  recordedAt: entry.recordedAt,
  recordedBy: String(entry.recordedBy),
  notes: entry.notes ?? '',
  debtBalanceAfter: toApiString(entry.debtBalanceAfter),
  receivableBalanceAfter: toApiString(entry.receivableBalanceAfter),
  drawerTransactionId: entry.drawerTransactionId ? String(entry.drawerTransactionId) : null
});
