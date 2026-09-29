export class ApiContractError extends Error {
  constructor(message, payload) {
    super(message);
    this.name = "ApiContractError";
    this.code = "INVALID_API_ENVELOPE";
    this.payload = payload;
  }
}

export function assertEnvelope(payload) {
  if (!payload || typeof payload !== "object" || typeof payload.ok !== "boolean") {
    throw new ApiContractError("استجابة الخادم لا تطابق عقد API", payload);
  }
  if (payload.ok && !("data" in payload)) {
    throw new ApiContractError("استجابة ناجحة من دون data", payload);
  }
  if (!payload.ok && (!payload.error || typeof payload.error !== "object")) {
    throw new ApiContractError("استجابة خطأ من دون error", payload);
  }
  return payload;
}

export function unwrapData(payload) {
  const envelope = assertEnvelope(payload);
  if (!envelope.ok) throw new ApiContractError(envelope.error?.messageAr || "فشل الطلب", payload);
  return envelope.data;
}

export function unwrapWithMeta(payload) {
  const envelope = assertEnvelope(payload);
  if (!envelope.ok) throw new ApiContractError(envelope.error?.messageAr || "فشل الطلب", payload);
  return { data: envelope.data, meta: envelope.meta || {} };
}

export function unwrapPage(payload, itemKey = "items") {
  const { data, meta } = unwrapWithMeta(payload);
  const items = Array.isArray(data) ? data : data?.[itemKey];
  if (!Array.isArray(items)) throw new ApiContractError(`قائمة ${itemKey} غير موجودة في الاستجابة`, payload);
  const page = Number(meta.page ?? 1);
  const limit = Number(meta.limit ?? 10);
  const total = Number(meta.total ?? items.length);
  const pages = Number(meta.pages ?? Math.max(1, Math.ceil(total / Math.max(1, limit))));
  return {
    items,
    extra: Array.isArray(data) ? {} : Object.fromEntries(Object.entries(data || {}).filter(([key]) => key !== itemKey)),
    page,
    limit,
    total,
    pages,
    hasNext: Boolean(meta.hasNext ?? page < pages),
    hasPrevious: Boolean(meta.hasPrevious ?? page > 1),
    requestId: meta.requestId,
    serverTime: meta.serverTime,
    sort: meta.sort,
  };
}
