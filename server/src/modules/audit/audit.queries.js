import { buildPageMeta, buildSkipLimit, parsePage } from '../../platform/database/pagination.js';
import { ApiError } from '../../platform/http/api-error.js';
import { AuditEvent } from '../../platform/audit/audit-event.model.js';

const listItemDto = (event) => ({
  id: event._id ? String(event._id) : '',
  eventNo: event.eventNo,
  eventType: event.eventType,
  module: event.module,
  action: event.action,
  actor: event.actor,
  entity: event.entity,
  result: event.result,
  severity: event.severity,
  occurredAt: event.occurredAt
});

async function attachActorNames(events, context = {}) {
  const list = Array.isArray(events) ? events : [events];
  const employeeIds = [
    ...new Set(
      list
        .filter((event) => event?.actor?.type === 'EMPLOYEE' && event?.actor?.id)
        .map((event) => String(event.actor.id))
    )
  ];
  const customerOrderIds = [
    ...new Set(
      list
        .filter((event) => event?.actor?.type === 'CUSTOMER' && event?.entity?.type === 'CustomerOrder' && event?.entity?.id)
        .map((event) => String(event.entity.id))
    )
  ];

  const port = context.employeeDirectoryPort;
  let names = {};
  if (employeeIds.length && port?.getNamesByIds)
    names = (await port.getNamesByIds(employeeIds, context)) ?? {};

  const employeeModel = context.auditModels?.Employee;
  const roleModel = context.auditModels?.Role;
  let employeeRows = [];
  if (employeeIds.length && employeeModel) {
    employeeRows = await employeeModel.find({ _id: { $in: employeeIds } }).select('name roleId').lean();
    for (const row of employeeRows) names[String(row._id)] ??= row.name ?? null;
  }
  const roleIds = [...new Set(employeeRows.map((row) => row.roleId).filter(Boolean).map(String))];
  const roles = roleIds.length && roleModel
    ? await roleModel.find({ _id: { $in: roleIds } }).select('name').lean()
    : [];
  const roleNames = Object.fromEntries(roles.map((row) => [String(row._id), row.name ?? null]));
  const employeeRoleIds = Object.fromEntries(employeeRows.map((row) => [String(row._id), String(row.roleId ?? '')]));

  const orderModel = context.auditModels?.Order;
  const customerOrders = customerOrderIds.length && orderModel
    ? await orderModel.find({ _id: { $in: customerOrderIds } }).select('customerId customerName').lean()
    : [];
  const customerByOrderId = Object.fromEntries(
    customerOrders.map((row) => [String(row._id), { id: row.customerId ? String(row.customerId) : null, name: row.customerName ?? null }])
  );

  const apply = (event) => {
    if (!event?.actor) return event;
    if (event.actor.type === 'EMPLOYEE') {
      const employeeId = String(event.actor.id);
      const name = event.actor.name ?? names[employeeId] ?? null;
      const roleName = event.actor.roleName ?? roleNames[employeeRoleIds[employeeId]] ?? null;
      const hasResolvedName = event.actor.name !== undefined || Boolean(port?.getNamesByIds) || employeeRows.length > 0;
      return {
        ...event,
        actor: {
          ...event.actor,
          ...(hasResolvedName ? { name } : {}),
          ...(roleName ? { roleName } : {})
        }
      };
    }
    if (event.actor.type === 'CUSTOMER') {
      const customer = customerByOrderId[String(event.entity?.id)];
      const customerId = event.actor.id ?? customer?.id ?? null;
      const name = event.actor.name ?? customer?.name ?? null;
      return {
        ...event,
        actor: {
          ...event.actor,
          ...(customerId ? { id: customerId } : {}),
          ...(name ? { name } : {})
        }
      };
    }
    return event;
  };
  return Array.isArray(events) ? list.map(apply) : apply(events);
}

export async function getAuditScreen(filters = {}, context = {}) {
  const model = context.auditModel ?? AuditEvent;
  const { page, limit } = parsePage(filters);
  const { skip } = buildSkipLimit({ page, limit });
  const query = {};
  if (filters.module) query.module = filters.module;
  if (filters.eventType) query.eventType = filters.eventType;
  if (filters.actorId) query['actor.id'] = filters.actorId;
  if (filters.result) query.result = filters.result;
  if (filters.severity) query.severity = filters.severity;
  if (filters.from || filters.to)
    query.occurredAt = {
      ...(filters.from ? { $gte: new Date(filters.from) } : {}),
      ...(filters.to ? { $lte: new Date(filters.to) } : {})
    };
  const [rows, totalItems, summaryRows] = await Promise.all([
    model.find(query).sort({ occurredAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    model.countDocuments(query),
    model
      .aggregate([
        { $match: query },
        { $group: { _id: { result: '$result', severity: '$severity' }, count: { $sum: 1 } } }
      ])
      .catch(() => [])
  ]);
  const summary = { total: totalItems, success: 0, failed: 0, denied: 0, warning: 0, critical: 0 };
  for (const row of summaryRows) {
    if (row._id?.result === 'SUCCESS') summary.success += row.count;
    else if (row._id?.result === 'FAILED') summary.failed += row.count;
    if (row._id?.result === 'DENIED') summary.denied += row.count;
    if (row._id?.severity === 'WARNING') summary.warning += row.count;
    if (row._id?.severity === 'CRITICAL') summary.critical += row.count;
  }
  return {
    summary,
    items: await attachActorNames(rows.map(listItemDto), context),
    filters: {
      module: filters.module ?? null,
      eventType: filters.eventType ?? null,
      actorId: filters.actorId ?? null,
      result: filters.result ?? null,
      severity: filters.severity ?? null,
      from: filters.from ?? null,
      to: filters.to ?? null
    },
    pageMeta: buildPageMeta({ page, limit, totalItems, sort: { occurredAt: -1 } })
  };
}

export async function getAuditEvent(id, context = {}) {
  const model = context.auditModel ?? AuditEvent;
  const event = await model.findById(id).lean();
  if (!event)
    throw new ApiError({ code: 'AUDIT_NOT_FOUND', status: 404, messageAr: 'الحدث غير موجود' });
  const { _id, ...rest } = event;
  return { event: await attachActorNames({ id: String(_id), ...rest }, context) };
}

export async function getEntityTimeline(entityType, entityId, filters = {}, context = {}) {
  const model = context.auditModel ?? AuditEvent;
  const { page, limit } = parsePage(filters);
  const { skip } = buildSkipLimit({ page, limit });
  const query = { 'entity.type': entityType, 'entity.id': String(entityId) };
  const [rows, totalItems] = await Promise.all([
    model.find(query).sort({ occurredAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    model.countDocuments(query)
  ]);
  return {
    items: await attachActorNames(
      rows.map((event) => ({
        id: event._id ? String(event._id) : '',
        eventNo: event.eventNo,
        eventType: event.eventType,
        action: event.action,
        actor: event.actor,
        result: event.result,
        severity: event.severity,
        occurredAt: event.occurredAt,
        summary: `${event.action} ${event.result}`
      })),
      context
    ),
    pageMeta: buildPageMeta({ page, limit, totalItems, sort: { occurredAt: -1 } })
  };
}
