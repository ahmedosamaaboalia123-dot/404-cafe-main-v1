import { buildPageMeta, buildSkipLimit, parsePage } from '../../platform/database/pagination.js';
import { toApiString } from '../../platform/database/decimal.js';
import { ApiError } from '../../platform/http/api-error.js';
import { Order, OrderItem } from '../orders/order.models.js';
import { TableSession } from '../tables/tables.models.js';
import { TableGuestSession } from '../table-experience/table-experience.models.js';

const CURRENT_STATUSES = ['CONFIRMED', 'PREPARING'];

/**
 * A DINE_IN order only stores the session ids, never the table number, so the
 * kitchen screen used to render "طاولة undefined" for every table order. Both
 * session kinds carry `tableNumber`: `tableSessionId` is set when the order is
 * opened from a table, and `tableGuestSessionId` when a guest proposal is
 * confirmed. Only the ids present on the page are looked up, so an online-only
 * page never touches these collections.
 */
async function resolveTableNumbers(orders, context = {}) {
  const tableModels = context.tableModels ?? { TableSession, TableGuestSession };
  const sessionIds = orders.map((order) => order.tableSessionId).filter(Boolean);
  const guestIds = orders.map((order) => order.tableGuestSessionId).filter(Boolean);
  const [sessions, guests] = await Promise.all([
    sessionIds.length && tableModels.TableSession?.find
      ? tableModels.TableSession.find({ _id: { $in: sessionIds } })
          .select({ tableNumber: 1 })
          .lean()
      : [],
    guestIds.length && tableModels.TableGuestSession?.find
      ? tableModels.TableGuestSession.find({ _id: { $in: guestIds } })
          .select({ tableNumber: 1 })
          .lean()
      : []
  ]);
  const bySession = new Map(sessions.map((row) => [String(row._id), row.tableNumber]));
  const byGuest = new Map(guests.map((row) => [String(row._id), row.tableNumber]));
  return (order) =>
    bySession.get(String(order.tableSessionId)) ??
    byGuest.get(String(order.tableGuestSessionId)) ??
    null;
}

const cardItemDto = (item) => ({
  id: String(item._id),
  productName: item.productName,
  sizeName: item.sizeName,
  quantity: item.quantity,
  status: item.status
});

const detailItemDto = (item) => ({
  id: String(item._id),
  productName: item.productName,
  typeName: item.typeName,
  sizeName: item.sizeName,
  quantity: item.quantity,
  notes: item.notes ?? null,
  status: item.status,
  recipeSnapshot: (item.recipeSnapshot ?? []).map((ingredient) => ({
    materialId: String(ingredient.materialId),
    quantitySmall: toApiString(ingredient.quantitySmall),
    materialName: ingredient.materialName,
    unitName: ingredient.unitName
  })),
  version: item.version ?? 0
});

export async function getPreparationScreen(filters = {}, context = {}) {
  const models = context.orderModels ?? { Order, OrderItem };
  const { page, limit } = parsePage(filters);
  const { skip } = buildSkipLimit({ page, limit });
  const fulfillmentType =
    filters.group === 'tables' ? 'DINE_IN' : { $in: ['TAKEAWAY', 'DELIVERY'] };
  const status = filters.tab === 'ready' ? 'READY' : { $in: CURRENT_STATUSES };
  const query = { fulfillmentType, status };
  const [rows, totalItems, currentCount, readyCount] = await Promise.all([
    models.Order.find(query).sort({ createdAt: 1, _id: 1 }).skip(skip).limit(limit).lean(),
    models.Order.countDocuments(query),
    models.Order.countDocuments({ fulfillmentType, status: { $in: CURRENT_STATUSES } }),
    models.Order.countDocuments({ fulfillmentType, status: 'READY' })
  ]);
  const allItems = rows.length
    ? await models.OrderItem.find({ orderId: { $in: rows.map((order) => order._id) } })
        .sort({ lineNo: 1, _id: 1 })
        .lean()
    : [];
  const tableNumberOf = await resolveTableNumbers(rows, context);
  const cards = rows.map((order) => {
    const items = allItems.filter((item) => String(item.orderId) === String(order._id));
    const active = items.filter((item) => item.status !== 'CANCELLED');
    return {
      id: String(order._id),
      orderNumber: order.orderNumber,
      fulfillmentType: order.fulfillmentType,
      tableNumber: order.fulfillmentType === 'DINE_IN' ? tableNumberOf(order) : null,
      customer: { name: order.customerName, phone: order.customerPhone },
      total: toApiString(order.total),
      status: order.status,
      items: active.map(cardItemDto),
      progress: {
        ready: active.filter((item) => item.status === 'READY').length,
        total: active.length
      },
      createdAt: order.createdAt,
      version: order.version ?? 0
    };
  });
  return {
    summary: { current: currentCount, ready: readyCount },
    items: cards,
    pageMeta: buildPageMeta({ page, limit, totalItems, sort: { createdAt: 1 } })
  };
}

export async function getPreparationDashboard(context = {}) {
  const models = context.orderModels ?? { Order, OrderItem };
  const orders = await models.Order.find({
    status: { $in: [...CURRENT_STATUSES, 'READY'] }
  })
    .sort({ createdAt: 1, _id: 1 })
    .lean();
  const limited = orders.reduce((result, order) => {
    const group = order.fulfillmentType === 'DINE_IN' ? 'tables' : 'online';
    const tab = order.status === 'READY' ? 'ready' : 'current';
    const key = `${group}.${tab}`;
    if ((result[key] ?? []).length < 10) (result[key] ??= []).push(order);
    return result;
  }, {});
  const selected = Object.values(limited).flat();
  const items = selected.length
    ? await models.OrderItem.find({ orderId: { $in: selected.map((order) => order._id) } })
        .sort({ lineNo: 1, _id: 1 })
        .lean()
    : [];
  const card = (order) => {
    const active = items.filter(
      (item) => String(item.orderId) === String(order._id) && item.status !== 'CANCELLED'
    );
    return {
      id: String(order._id),
      orderNumber: order.orderNumber,
      fulfillmentType: order.fulfillmentType,
      customer: { name: order.customerName, phone: order.customerPhone },
      total: toApiString(order.total),
      status: order.status,
      items: active.map(cardItemDto),
      progress: {
        ready: active.filter((item) => item.status === 'READY').length,
        total: active.length
      },
      createdAt: order.createdAt,
      version: order.version ?? 0
    };
  };
  const section = (key) => (limited[key] ?? []).map(card);
  return {
    online: { current: section('online.current'), ready: section('online.ready') },
    tables: { current: section('tables.current'), ready: section('tables.ready') },
    summary: {
      onlineCurrent: orders.filter((o) => o.fulfillmentType !== 'DINE_IN' && o.status !== 'READY')
        .length,
      onlineReady: orders.filter((o) => o.fulfillmentType !== 'DINE_IN' && o.status === 'READY')
        .length,
      tablesCurrent: orders.filter((o) => o.fulfillmentType === 'DINE_IN' && o.status !== 'READY')
        .length,
      tablesReady: orders.filter((o) => o.fulfillmentType === 'DINE_IN' && o.status === 'READY')
        .length
    }
  };
}

export async function getPreparationOrderDetails(id, context = {}) {
  const models = context.orderModels ?? { Order, OrderItem };
  const order = await models.Order.findById(id).lean();
  if (!order)
    throw new ApiError({ code: 'ORDER_NOT_FOUND', status: 404, messageAr: 'الطلب غير موجود' });
  const items = await models.OrderItem.find({ orderId: order._id })
    .sort({ lineNo: 1, _id: 1 })
    .lean();
  const active = items.filter((item) => item.status !== 'CANCELLED');
  return {
    order: {
      id: String(order._id),
      orderNumber: order.orderNumber,
      fulfillmentType: order.fulfillmentType,
      customer: { name: order.customerName, phone: order.customerPhone },
      status: order.status,
      version: order.version ?? 0
    },
    items: active.map(detailItemDto),
    progress: {
      ready: active.filter((item) => item.status === 'READY').length,
      total: active.length
    },
    version: order.version ?? 0
  };
}
