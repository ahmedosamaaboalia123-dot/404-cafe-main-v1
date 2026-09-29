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
import { writeAudit } from '../../platform/audit/audit-writer.js';
import { enqueueDomainEvent } from '../../platform/events/outbox-writer.js';
import { ApiError } from '../../platform/http/api-error.js';
import { OrderPayment } from './payment.models.js';

const defaults = { OrderPayment };
const requireOrderPort = (context) => {
  if (!context.ordersPort?.getForPayment || !context.ordersPort?.applyPaymentSummary)
    throw new ApiError({
      code: 'ORDERS_PORT_UNAVAILABLE',
      status: 503,
      messageAr: 'خدمة الطلبات غير متاحة'
    });
  return context.ordersPort;
};
async function record(kind, aggregateId, payload, context) {
  await writeAudit(
    {
      eventType: kind.toUpperCase().replaceAll('.', '_'),
      category: 'FINANCIAL',
      module: 'payments',
      action: kind,
      actor: { type: context.actorType, id: context.actorId },
      entity: { type: 'OrderPayment', id: aggregateId },
      result: 'SUCCESS',
      severity: 'INFO',
      metadataSafe: payload,
      requestId: context.requestId
    },
    context
  );
  await enqueueDomainEvent(
    {
      aggregateType: 'OrderPayment',
      aggregateId: String(aggregateId),
      eventType: kind,
      payload,
      sequence: payload.sequence
    },
    context
  );
}
export async function calculateOrderPaymentSummary(orderId, context = {}) {
  const models = context.paymentModels ?? defaults;
  const rows = await models.OrderPayment.find({ orderId }).lean();
  const paid = rows
    .filter((p) => ['COLLECTED', 'SETTLED', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(p.status))
    .reduce((s, p) => add(s, p.amount), '0');
  const refunded = rows.reduce((s, p) => add(s, p.refundedAmount ?? '0'), '0');
  const netPaid = subtract(paid, refunded);
  const order = context.ordersPort?.getSummary
    ? await context.ordersPort.getSummary(orderId, context)
    : null;
  return {
    paid: toApiString(paid),
    refunded: toApiString(refunded),
    netPaid: toApiString(netPaid),
    balanceDue: order ? toApiString(subtract(order.total, netPaid)) : null
  };
}
export async function collectCash(orderId, input, context = {}) {
  // Defense in depth: the route already requires a positive amount, but this
  // service is also reachable through internal ports.
  if (!isPositive(input.amount))
    throw new ApiError({
      code: 'PAYMENT_INVALID_AMOUNT',
      status: 422,
      messageAr: 'مبلغ التحصيل يجب أن يكون موجباً'
    });
  return runInTransaction(
    async (tx) => {
      const models = context.paymentModels ?? defaults,
        orders = requireOrderPort(context);
      const order = await orders.getForPayment(orderId, input.expectedOrderVersion, {
        ...context,
        ...tx
      });
      if (compare(input.amount, order.balanceDue) > 0)
        throw new ApiError({
          code: 'PAYMENT_EXCEEDS_BALANCE',
          status: 409,
          messageAr: 'المبلغ أكبر من المتبقي على الطلب'
        });
      if (input.collectionMode === 'COD' && !order.deliveryAssignmentId)
        throw new ApiError({
          code: 'COD_ASSIGNMENT_REQUIRED',
          status: 409,
          messageAr: 'تحصيل المندوب يتطلب إسناد توصيل نشط'
        });
      const sequence = await nextSequence('order-payment', { ...context, ...tx });
      const [payment] = await models.OrderPayment.create(
        [
          {
            orderId,
            paymentNo: `PAY-${String(sequence).padStart(8, '0')}`,
            method: 'CASH',
            collectionMode: input.collectionMode,
            status: input.collectionMode === 'DIRECT' ? 'SETTLED' : 'COLLECTED',
            amount: toDecimal128(input.amount),
            refundedAmount: toDecimal128('0'),
            collectedByType: input.collectionMode === 'COD' ? 'DELEGATE' : 'EMPLOYEE',
            collectedById:
              input.collectionMode === 'COD' ? order.assignedDelegateId : context.actorId,
            collectedAt: context.now ?? new Date(),
            operationRequestId: context.operationRequestId
          }
        ],
        { session: tx.session }
      );
      let drawerTransaction = null;
      if (input.collectionMode === 'DIRECT') {
        if (!context.drawerPort?.createSourceCashTransaction)
          throw new ApiError({
            code: 'DRAWER_PORT_UNAVAILABLE',
            status: 503,
            messageAr: 'خدمة الدرج غير متاحة'
          });
        const movement = await context.drawerPort.createSourceCashTransaction(
          {
            direction: 'IN',
            amount: input.amount,
            accountingClass: 'ORDER_CASH_SALE',
            description: `تحصيل الطلب ${order.orderNumber}`,
            sourceType: 'ORDER_PAYMENT',
            sourceId: payment._id,
            snapshots: { orderId: String(orderId), paymentNo: payment.paymentNo }
          },
          { ...context, ...tx }
        );
        drawerTransaction = movement.transaction;
        payment.cashDrawerTransactionId = drawerTransaction._id;
        payment.settledAt = context.now ?? new Date();
        payment.settledBy = context.actorId;
        await payment.save({ session: tx.session });
      }
      const updatedOrder = await orders.applyPaymentSummary(
        orderId,
        { paidDelta: input.amount, expectedVersion: input.expectedOrderVersion },
        { ...context, ...tx }
      );
      await record(
        'payment.collected',
        payment._id,
        {
          paymentId: String(payment._id),
          orderId: String(orderId),
          collectionMode: input.collectionMode,
          sequence: (payment.version ?? 0) + 1
        },
        { ...context, ...tx }
      );
      return { payment, order: updatedOrder, drawerTransaction };
    },
    context,
    context.transactionOptions
  );
}
export async function settleCodPayment(paymentId, input, context = {}) {
  return runInTransaction(
    async (tx) => {
      const models = context.paymentModels ?? defaults;
      const payment = await models.OrderPayment.findOne({
        _id: paymentId,
        version: input.expectedPaymentVersion,
        collectionMode: 'COD',
        status: 'COLLECTED'
      }).session(tx.session);
      if (!payment)
        throw new ApiError({
          code: 'COD_SETTLEMENT_CONFLICT',
          status: 409,
          messageAr: 'الدفعة مسواة أو تغيرت'
        });
      if (!context.drawerPort?.createSourceCashTransaction)
        throw new ApiError({
          code: 'DRAWER_PORT_UNAVAILABLE',
          status: 503,
          messageAr: 'خدمة الدرج غير متاحة'
        });
      const movement = await context.drawerPort.createSourceCashTransaction(
        {
          direction: 'IN',
          amount: payment.amount,
          accountingClass: 'COD_SETTLEMENT',
          description: `تسوية ${payment.paymentNo}`,
          sourceType: 'COD_PAYMENT_SETTLEMENT',
          sourceId: payment._id,
          snapshots: { orderId: String(payment.orderId) }
        },
        { ...context, ...tx }
      );
      payment.status = 'SETTLED';
      payment.settledAt = context.now ?? new Date();
      payment.settledBy = context.actorId;
      payment.cashDrawerTransactionId = movement.transaction._id;
      await payment.save({ session: tx.session });
      await record(
        'payment.settled',
        payment._id,
        {
          paymentId: String(payment._id),
          orderId: String(payment.orderId),
          sequence: (payment.version ?? 0) + 1
        },
        { ...context, ...tx }
      );
      return { payment, drawerTransaction: movement.transaction };
    },
    context,
    context.transactionOptions
  );
}
