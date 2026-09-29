import { toApiString } from '../../platform/database/decimal.js';
export const paymentDto = (p) => ({
  id: String(p._id),
  orderId: String(p.orderId),
  paymentNo: p.paymentNo,
  method: p.method,
  collectionMode: p.collectionMode,
  status: p.status,
  amount: toApiString(p.amount),
  // Legacy documents may predate the field; never crash the listing on them.
  refundedAmount: toApiString(p.refundedAmount ?? '0'),
  collectedByType: p.collectedByType,
  collectedById: String(p.collectedById),
  collectedAt: p.collectedAt,
  settledAt: p.settledAt ?? null,
  cashDrawerTransactionId: p.cashDrawerTransactionId ? String(p.cashDrawerTransactionId) : null,
  version: p.version ?? 0
});
