import { buildPageMeta, buildSkipLimit, parsePage } from '../../platform/database/pagination.js';
import { toApiString } from '../../platform/database/decimal.js';
import { ApiError } from '../../platform/http/api-error.js';
import { TableOrderProposal } from './table-experience.models.js';

export const proposalDto = (proposal) => ({
  id: String(proposal._id),
  proposalNumber: proposal.proposalNumber,
  tableNumber: proposal.tableNumber,
  status: proposal.status,
  items: (proposal.items ?? []).map((item) => ({
    productName: item.productName,
    sizeName: item.sizeName,
    quantity: item.quantity,
    lineSubtotal: toApiString(item.lineSubtotal ?? '0')
  })),
  subtotal: toApiString(proposal.subtotal ?? '0'),
  reviewNote: proposal.reviewNote ?? null,
  confirmedOrderId: proposal.confirmedOrderId ? String(proposal.confirmedOrderId) : null,
  version: proposal.version ?? 0
});

/**
 * Guest-facing view of a table order. Deliberately omits the internal money
 * fields that orderDto exposes (actualInventoryCost / actualProfit) and the
 * customer phone, and returns the order id so the guest can post a review.
 */
export const guestOrderDto = (order, items = [], tableNumber) => ({
  id: String(order._id),
  orderNumber: order.orderNumber,
  publicOrderNumber: order.publicOrderNumber,
  status: order.status,
  tableNumber: tableNumber ?? null,
  fulfillmentType: order.fulfillmentType,
  totals: {
    subtotal: toApiString(order.subtotal ?? '0'),
    discount: toApiString(order.discount ?? '0'),
    tax: toApiString(order.tax ?? '0'),
    total: toApiString(order.total ?? '0')
  },
  balanceDue: toApiString(order.balanceDue ?? '0'),
  paymentStatus: order.paymentStatus,
  createdAt: order.createdAt ?? null,
  items: items.map((item) => ({
    id: String(item._id),
    lineNo: item.lineNo,
    productName: item.productName,
    typeName: item.typeName ?? '',
    sizeName: item.sizeName ?? '',
    addons: item.addonNames ?? [],
    notes: item.notes ?? '',
    quantity: item.quantity,
    unitSellingPrice: toApiString(item.unitSellingPrice ?? '0'),
    lineSubtotal: toApiString(item.lineSubtotal ?? '0'),
    status: item.status
  }))
});

export async function listProposals(filters = {}, context = {}) {
  const models = context.tableGuestModels ?? { TableOrderProposal };
  const { page, limit } = parsePage(filters);
  const { skip } = buildSkipLimit({ page, limit });
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.tableNumber) query.tableNumber = filters.tableNumber;
  const [rows, totalItems, waiting] = await Promise.all([
    models.TableOrderProposal.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    models.TableOrderProposal.countDocuments(query),
    models.TableOrderProposal.countDocuments({ ...query, status: 'WAITING_WAITER' })
  ]);
  return {
    summary: { total: totalItems, waiting },
    proposals: rows.map(proposalDto),
    pageMeta: buildPageMeta({ page, limit, totalItems, sort: { createdAt: -1 } })
  };
}

export async function getProposalDetails(id, context = {}) {
  const models = context.tableGuestModels ?? { TableOrderProposal };
  const proposal = await models.TableOrderProposal.findById(id).lean();
  if (!proposal)
    throw new ApiError({ code: 'PROPOSAL_NOT_FOUND', status: 404, messageAr: 'المقترح غير موجود' });
  return { proposal: proposalDto(proposal) };
}
