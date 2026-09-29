const DEFAULT_MESSAGES = {
  NETWORK_ERROR: "لا يوجد اتصال بالخادم",
  REQUEST_TIMEOUT: "استغرق الطلب وقتًا أطول من المتوقع",
  FORBIDDEN: "ليس لديك صلاحية لتنفيذ هذا الإجراء",
  VERSION_CONFLICT: "تم تعديل البيانات من مستخدم آخر. حمّل أحدث نسخة وحاول مجددًا",
  TRANSACTION_CONFLICT: "حدث تعارض متزامن. حمّل أحدث البيانات وحاول مجددًا",
  DUPLICATE_VALUE: "القيمة مستخدمة بالفعل",
  VALIDATION_ERROR: "راجع البيانات المدخلة",
  MATERIAL_UNITS_LOCKED: "الحقول الأساسية (المورد والوحدات والمعامل) مقفلة بعد أول دفعة أو وصفة ولا يمكن تغييرها",
  PAYLOAD_TOO_LARGE: "حجم الملف أو البيانات أكبر من المسموح",
  INTERNAL_ERROR: "حدث خطأ داخلي",
};

export function normalizeApiError(error) {
  if (error?.normalizedApiError) return error;
  const response = error?.response;
  const body = response?.data;
  const apiError = body?.error || {};
  const timedOut = error?.code === "ECONNABORTED" || error?.code === "ETIMEDOUT";
  const noResponse = !response;
  const code = apiError.code || (timedOut ? "REQUEST_TIMEOUT" : noResponse ? "NETWORK_ERROR" : "UNKNOWN_ERROR");
  return {
    normalizedApiError: true,
    status: response?.status ?? null,
    code,
    message: apiError.messageAr || DEFAULT_MESSAGES[code] || error?.message || "حدث خطأ غير متوقع",
    fieldErrors: Array.isArray(apiError.fieldErrors) ? apiError.fieldErrors : [],
    details: apiError.details ?? null,
    requestId: body?.meta?.requestId || response?.headers?.["x-request-id"] || null,
    serverTime: body?.meta?.serverTime || null,
    retryable: Boolean(apiError.retryable || noResponse),
    cause: error,
  };
}

export const getArabicErrorMessage = (error) => normalizeApiError(error).message;
export const isConflict = (error) => { const c = normalizeApiError(error).code || ""; return c.endsWith("_CONFLICT") || c === "VERSION_CONFLICT"; };
export const isPermissionDenied = (error) => normalizeApiError(error).status === 403;
export const isSessionExpired = (error) => normalizeApiError(error).status === 401;
export const isDevicePending = (error) => normalizeApiError(error).code === "DEVICE_APPROVAL_REQUIRED";

export function applyFieldErrors(setError, error) {
  if (typeof setError !== "function") return 0;
  const fieldErrors = normalizeApiError(error).fieldErrors;
  for (const item of fieldErrors) {
    const field = item.path || item.field;
    if (field) setError(field, { type: "server", message: item.messageAr || item.message || "قيمة غير صحيحة" });
  }
  return fieldErrors.length;
}
