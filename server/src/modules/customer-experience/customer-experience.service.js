import { validateService } from '../../platform/http/validate-service.js';
import { publicReviewBody } from './customer-experience.validation.js';
import { compare, subtract, toApiString } from '../../platform/database/decimal.js';
import { runInTransaction } from '../../platform/database/transaction.js';
import { writeAudit } from '../../platform/audit/audit-writer.js';
import { enqueueDomainEvent } from '../../platform/events/outbox-writer.js';
import { ApiError } from '../../platform/http/api-error.js';
import { createOpaqueToken, hashToken } from '../../shared/utils/hash-token.js';
import { normalizePhone } from '../../shared/utils/normalize-phone.js';
import { nextSequence } from '../../platform/database/sequence.js';
import { Order, OrderItem, OrderStatusEvent } from '../orders/order.models.js';
import {
  confirmNewOrder,
  appendOrderItems,
  cancelWholeOrder
} from '../orders/order.public-service.js';
import { confirmDeliveryReceipt } from '../delivery/delivery.public-service.js';
import { listCustomerOrders } from '../orders/order.public-service.js';
import { getOrderReview, submitOrderReview } from '../reviews/review.public-service.js';
import {
  CustomerAccessSession,
  CustomerOrderCredential,
  OrderCancellationRequest
} from './customer-experience.models.js';
import { resolveActionCredential } from './customer-experience.middleware.js';
import { lookupRateLimiter } from './customer-experience.middleware.js';

const defaults = {
  Order,
  OrderItem,
  OrderStatusEvent,
  CustomerOrderCredential,
  CustomerAccessSession,
  OrderCancellationRequest
};

const READ_TOKEN_DAYS = 30;
const ACTION_TOKEN_DAYS = 7;
const ACCESS_SESSION_DAYS = 30;

const daysFromNow = (days, now) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

export function maskPhone(phone) {
  if (!phone || phone.length < 6) return '****';
  return `${phone.slice(0, 6)}****${phone.slice(-2)}`;
}

async function record(kind, entityId, payload, context) {
  const sequence = await nextSequence(`customer-order-experience:${entityId}`, context);
  await writeAudit(
    {
      eventType: kind.toUpperCase().replaceAll('.', '_').replaceAll('-', '_'),
      category: 'BUSINESS',
      module: 'customer-experience',
      action: kind,
      actor: { type: context.actorType ?? 'CUSTOMER', id: context.actorId },
      entity: { type: 'CustomerOrder', id: entityId },
      result: 'SUCCESS',
      severity: 'INFO',
      metadataSafe: payload,
      requestId: context.requestId
    },
    context
  );
  await enqueueDomainEvent(
    {
      aggregateType: 'CustomerOrderExperience',
      aggregateId: String(entityId),
      eventType: kind,
      payload,
      sequence
    },
    context
  );
}

export async function issueOrderCredentials(order, context = {}) {
  return runInTransaction(
    async (tx) => {
      const models = context.publicOrderModels ?? defaults;
      const now = context.now ?? new Date();
      const trackingReadToken = createOpaqueToken();
      const orderActionToken = createOpaqueToken();
      const [credential] = await models.CustomerOrderCredential.create(
        [
          {
            orderId: order._id,
            customerId: order.customerId,
            trackingReadTokenHash: hashToken(trackingReadToken),
            orderActionTokenHash: hashToken(orderActionToken),
            readExpiresAt: daysFromNow(READ_TOKEN_DAYS, now),
            actionExpiresAt: daysFromNow(ACTION_TOKEN_DAYS, now),
            operationRequestId: context.operationRequestId
          }
        ],
        { session: tx.session }
      );
      await record(
        'credentials.issued',
        order._id,
        { orderId: String(order._id), orderNumber: order.orderNumber },
        { ...context, ...tx }
      );
      return {
        credential,
        trackingReadToken,
        orderActionToken,
        readExpiresAt: credential.readExpiresAt,
        actionExpiresAt: credential.actionExpiresAt
      };
    },
    context,
    context.transactionOptions
  );
}

export async function createPublicOrder(input, context = {}) {
  // Single atomic transaction: the inner confirm() and issueOrderCredentials()
  // join this session automatically via runInTransaction session reuse, so a
  // credential failure rolls the order back instead of orphaning it.
  return runInTransaction(
    async (tx) => {
      const scope = { ...context, ...tx };
      const confirm = context.orderModule?.confirm ?? confirmNewOrder;
      const confirmed = await confirm(
        {
          fulfillmentType: input.fulfillmentType,
          customer: input.customer,
          items: input.items,
          channel: 'CUSTOMER_WEB'
        },
        scope
      );
      const issued = await issueOrderCredentials(confirmed.order, scope);
      return {
        order: confirmed.order,
        items: confirmed.items,
        totals: confirmed.totals,
        customer: { id: confirmed.order.customerId ? String(confirmed.order.customerId) : null },
        tracking: {
          publicOrderNumber: confirmed.order.publicOrderNumber,
          barcodeValue: confirmed.order.barcodeValue,
          trackingReadToken: issued.trackingReadToken,
          orderActionToken: issued.orderActionToken,
          readExpiresAt: issued.readExpiresAt,
          actionExpiresAt: issued.actionExpiresAt
        }
      };
    },
    context,
    context.transactionOptions
  );
}

export async function lookupPublicOrder(input, context = {}) {
  const models = context.publicOrderModels ?? defaults;
  const limiter = context.lookupLimiter ?? lookupRateLimiter;
  const normalizedPhone = normalizePhone(input.phone);
  const phoneDigits = normalizedPhone.replace(/\D/g, '');
  const phoneCandidates = [...new Set([
    String(input.phone).trim(),
    phoneDigits,
    normalizedPhone,
    phoneDigits.startsWith('20') ? `0${phoneDigits.slice(2)}` : null,
    phoneDigits.startsWith('20') ? `+${phoneDigits}` : null
  ].filter(Boolean))];
  limiter.check(`${context.clientIp ?? 'unknown'}:${input.orderNumber ?? normalizedPhone}`);
  const query = { customerPhone: { $in: phoneCandidates } };
  if (input.orderNumber)
    query.$or = [{ orderNumber: input.orderNumber }, { publicOrderNumber: input.orderNumber }];
  const result = models.Order.findOne(query);
  const order = input.orderNumber || typeof result.sort !== 'function'
    ? await result.lean()
    : await result.sort({ createdAt: -1, _id: -1 }).lean();
  const notFound = () =>
    new ApiError({ code: 'ORDER_NOT_FOUND', status: 404, messageAr: 'الطلب غير موجود' });
  if (!order) throw notFound();
  if (normalizePhone(order.customerPhone) !== normalizedPhone) throw notFound();
  const itemModel = models.OrderItem ?? OrderItem;
  const itemRows = itemModel?.find ? await itemModel.find({ orderId: order._id }).lean() : [];
  const activeItems = itemRows.filter((item) => item.status !== 'CANCELLED');
  return {
    orderNumber: order.orderNumber,
    publicOrderNumber: order.publicOrderNumber,
    status: order.status,
    fulfillmentType: order.fulfillmentType,
    createdAt: order.createdAt,
    paymentStatus: order.paymentStatus,
    maskedPhone: maskPhone(order.customerPhone),
    canProveOwnership: true,
    customer: {
      name: order.customerName,
      phone: order.customerPhone,
      address: order.customerAddress ?? ''
    },
    items: activeItems.map((item) => ({
      id: String(item._id),
      name: item.productName,
      size: item.sizeName,
      sizeName: item.sizeName,
      typeName: item.typeName,
      quantity: item.quantity,
      unitPrice: toApiString(item.unitSellingPrice),
      totalPrice: toApiString(item.lineSubtotal),
      notes: item.notes ?? '',
      status: item.status
    })),
    totals: {
      subtotal: toApiString(order.subtotal),
      discount: toApiString(order.discount),
      tax: toApiString(order.tax),
      deliveryFee: toApiString(order.deliveryFee),
      total: toApiString(order.total)
    }
  };
}

export async function addItemsUsingActionToken(order, input, context = {}) {
  const append = context.orderModule?.append ?? appendOrderItems;
  const result = await append(order._id, input, context);
  return {
    order: result.order,
    addedItems: result.addedItems,
    totals: result.totals,
    progress: result.progress,
    eventSequence: result.order.eventSequence,
    balanceDue: toApiString(result.order.balanceDue)
  };
}

export async function requestOrderCancellation(order, input, context = {}) {
  return runInTransaction(
    async (tx) => {
      const models = context.publicOrderModels ?? defaults;
      const existing = await models.OrderCancellationRequest.findOne({
        orderId: order._id
      }).session(tx.session);
      if (existing && ['PENDING', 'AUTO_APPROVED'].includes(existing.status))
        return { request: existing, order, executed: false };
      const netPaid = subtract(
        toApiString(order.paidAmount ?? '0'),
        toApiString(order.refundedAmount ?? '0')
      );
      const autoApprovable =
        ['CONFIRMED', 'PREPARING'].includes(order.status) && compare(netPaid, '0') <= 0;
      const [request] = await models.OrderCancellationRequest.create(
        [
          {
            orderId: order._id,
            customerId: order.customerId,
            status: autoApprovable ? 'AUTO_APPROVED' : 'PENDING',
            reason: input.reason,
            operationRequestId: context.operationRequestId
          }
        ],
        { session: tx.session }
      );
      let executed = false;
      if (autoApprovable) {
        const cancel = context.orderModule?.cancelWhole ?? cancelWholeOrder;
        await cancel(
          order._id,
          { reason: input.reason, expectedVersion: order.version },
          { ...context, ...tx }
        );
        request.status = 'EXECUTED';
        request.decidedAt = context.now ?? new Date();
        await request.save({ session: tx.session });
        executed = true;
      }
      await record(
        'cancellation.requested',
        order._id,
        { orderId: String(order._id), status: request.status },
        { ...context, ...tx }
      );
      const updated = await models.Order.findById(order._id).session(tx.session);
      return { request, order: updated ?? order, executed };
    },
    context,
    context.transactionOptions
  );
}

export async function confirmCustomerReceipt(order, input, context = {}) {
  const confirm = context.deliveryModule?.confirm ?? confirmDeliveryReceipt;
  const result = await confirm(
    order._id,
    {
      expectedVersion: input.expectedVersion,
      receivedBy: 'CUSTOMER',
      credentialId: input.credentialId
    },
    context
  );
  return {
    order: result.order,
    deliveryConfirmation: result.confirmation,
    reviewAvailable: true,
    invoice: result.invoice
  };
}

export async function submitPublicReview(order, input, context = {}) {
  input = validateService(publicReviewBody, input);
  const submit = context.reviewModule?.submit ?? submitOrderReview;
  const review = await submit(
    order._id,
    {
      rating: input.rating,
      comment: input.comment,
      displayName: input.displayName,
      expectedOrderVersion: input.expectedOrderVersion
    },
    context
  );
  return review;
}

export async function createCustomerAccessSession(input, context = {}) {
  return runInTransaction(
    async (tx) => {
      const models = context.publicOrderModels ?? defaults;
      const now = context.now ?? new Date();
      const { order } = await resolveActionCredential(input.orderNumber, input.orderActionToken, {
        ...context,
        publicOrderModels: models
      });
      if (!order.customerId)
        throw new ApiError({
          code: 'CUSTOMER_NOT_LINKED',
          status: 409,
          messageAr: 'الطلب غير مرتبط بعميل'
        });
      const sessionToken = createOpaqueToken();
      const [session] = await models.CustomerAccessSession.create(
        [
          {
            customerId: order.customerId,
            sessionTokenHash: hashToken(sessionToken),
            proofType: 'ORDER_ACTION_TOKEN',
            proofOrderId: order._id,
            issuedAt: now,
            expiresAt: daysFromNow(ACCESS_SESSION_DAYS, now)
          }
        ],
        { session: tx.session }
      );
      await record(
        'access-session.created',
        order._id,
        { orderId: String(order._id) },
        { ...context, ...tx }
      );
      return {
        customerAccessToken: sessionToken,
        expiresAt: session.expiresAt,
        customer: { id: String(order.customerId), maskedPhone: maskPhone(order.customerPhone) }
      };
    },
    context,
    context.transactionOptions
  );
}

export async function getCustomerOrderHistory(customerId, filters = {}, context = {}) {
  const listByCustomer = context.historyOrdersPort?.listByCustomer ?? listCustomerOrders;
  const readReview = context.historyReviewPort?.read ?? getOrderReview;
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 10;
  const { items, pageMeta } = await listByCustomer(customerId, { page, limit }, context);
  const models = context.publicOrderModels ?? defaults;
  const orderItemModel = models.OrderItem ?? OrderItem;
  let itemsByOrder = new Map();
  const orderIds = items.map((row) => row.id).filter(Boolean);
  if (orderIds.length && orderItemModel?.find) {
    const rows = await orderItemModel.find({ orderId: { $in: orderIds } }).lean();
    itemsByOrder = rows.reduce((acc, row) => {
      const key = String(row.orderId);
      const existing = acc.get(key) ?? [];
      acc.set(key, existing.concat(row));
      return acc;
    }, new Map());
  }
  const history = await Promise.all(
    items.map(async (item) => {
      const { review } = await readReview(item.id, context);
      const rows = itemsByOrder.get(String(item.id)) ?? [];
      const active = rows.filter((row) => row.status !== 'CANCELLED');
      return {
        id: item.id,
        orderNumber: item.orderNumber,
        publicOrderNumber: item.publicOrderNumber,
        barcodeValue: item.barcodeValue,
        fulfillmentType: item.fulfillmentType,
        status: item.status,
        total: item.totals.total,
        createdAt: item.createdAt,
        version: item.version,
        eventSequence: item.eventSequence,
        customerReceiptStatus: item.customerReceiptStatus,
        paymentStatus: item.paymentStatus,
        reviewStatus: review ? 'SUBMITTED' : 'NONE',
        customer: item.customer ?? {
          name: item.customerName,
          phone: item.customerPhone,
          address: item.customerAddress ?? ''
        },
        items: active.map((row) => ({
          id: String(row._id),
          name: row.productName,
          sizeName: row.sizeName,
          typeName: row.typeName,
          quantity: row.quantity,
          unitPrice: toApiString(row.unitSellingPrice),
          totalPrice: toApiString(row.lineSubtotal),
          status: row.status
        }))
      };
    })
  );
  return { items: history, pageMeta };
}

export { READ_TOKEN_DAYS, ACTION_TOKEN_DAYS, ACCESS_SESSION_DAYS };
