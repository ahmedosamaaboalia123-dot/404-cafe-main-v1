export const DEFAULT_PAGE_LIMIT = 10;

export function normalizePageParams(params = {}) {
  const page = Math.max(1, Math.trunc(Number(params.page) || 1));
  const requestedLimit = Math.trunc(Number(params.limit) || DEFAULT_PAGE_LIMIT);
  const limit = Math.min(DEFAULT_PAGE_LIMIT, Math.max(1, requestedLimit));
  return Object.fromEntries(
    Object.entries({ ...params, page, limit }).filter(([, value]) => value !== "" && value !== null && value !== undefined),
  );
}

/** First finite number among the candidates, or undefined. */
function firstNumber(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (value !== undefined && value !== null && value !== "" && Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

/**
 * The server builds every page envelope with `buildPageMeta`, which emits
 * `totalItems` / `totalPages` / `hasNextPage` / `hasPreviousPage`. Reading
 * `total` / `pages` / `hasNext` instead silently found nothing, so every screen
 * fell back to the current page: `pages` collapsed to 1, `hasNext` was always
 * false, and the controls showed "صفحة 1 من 1" no matter how many pages the
 * server had. The short names are kept as a fallback for payloads that still
 * use them.
 */
export function readPageMeta(meta = {}, itemCount = 0) {
  const page = Math.max(1, firstNumber(meta.page) ?? 1);
  const limit = Math.min(DEFAULT_PAGE_LIMIT, Math.max(1, firstNumber(meta.limit) ?? DEFAULT_PAGE_LIMIT));
  const total = Math.max(0, firstNumber(meta.totalItems, meta.total) ?? itemCount);
  const pages = Math.max(1, firstNumber(meta.totalPages, meta.pages) ?? Math.ceil(total / limit));
  const hasNext = meta.hasNextPage ?? meta.hasNext ?? page < pages;
  const hasPrevious = meta.hasPreviousPage ?? meta.hasPrevious ?? page > 1;
  return { page, limit, total, pages, hasNext: Boolean(hasNext), hasPrevious: Boolean(hasPrevious) };
}

export function resetPageOnFilterChange(previous, next) {
  const { page: _previousPage, ...previousFilters } = previous || {};
  const { page: _nextPage, ...nextFilters } = next || {};
  return JSON.stringify(previousFilters) === JSON.stringify(nextFilters) ? next : { ...next, page: 1 };
}
