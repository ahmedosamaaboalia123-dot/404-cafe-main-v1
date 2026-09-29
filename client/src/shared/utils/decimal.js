const DECIMAL_PATTERN = /^-?\d+(?:\.\d+)?$/;

export function decimalString(value, fallback = "0") {
  if (value === null || value === undefined || value === "") return fallback;
  const normalized = String(value).trim().replace(/,/g, "");
  return DECIMAL_PATTERN.test(normalized) ? normalized : fallback;
}

export function formatDecimal(value, { minimumFractionDigits = 0, maximumFractionDigits = 2, locale = "ar-EG" } = {}) {
  const normalized = decimalString(value);
  return new Intl.NumberFormat(locale, { minimumFractionDigits, maximumFractionDigits }).format(Number(normalized));
}

export function isPositiveDecimal(value) {
  const normalized = decimalString(value, "");
  if (!normalized) return false;
  return !normalized.startsWith("-") && !/^0+(?:\.0+)?$/.test(normalized);
}
