/**
 * utils/pagination-helpers.ts
 * ─────────────────────────────────────────────────────────────────
 * Cursor-based and offset-based pagination helpers.
 * All list endpoints use these to provide consistent pagination.
 */

// ── Types ─────────────────────────────────────────────────────────

export interface PaginationParams {
  page:     number;   // 1-indexed
  pageSize: number;   // default: 25, max: 100
}

export interface PaginatedResult<T> {
  data:       T[];
  total:      number;
  page:       number;
  pageSize:   number;
  totalPages: number;
  hasNext:    boolean;
  hasPrev:    boolean;
}

// ── Helpers ────────────────────────────────────────────────────────

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE     = 100;

/**
 * Parses and validates pagination query params from a URL.
 * Falls back to safe defaults if invalid values are provided.
 */
export function parsePagination(url: URL): PaginationParams {
  const rawPage = parseInt(url.searchParams.get("page") ?? "1", 10);
  const rawSize = parseInt(url.searchParams.get("page_size") ?? String(DEFAULT_PAGE_SIZE), 10);

  const page     = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const pageSize = isNaN(rawSize) || rawSize < 1
    ? DEFAULT_PAGE_SIZE
    : Math.min(rawSize, MAX_PAGE_SIZE);

  return { page, pageSize };
}

/**
 * Converts pagination params to Supabase range() arguments.
 * Supabase uses 0-indexed inclusive ranges: [from, to].
 */
export function toSupabaseRange(p: PaginationParams): { from: number; to: number } {
  const from = (p.page - 1) * p.pageSize;
  const to   = from + p.pageSize - 1;
  return { from, to };
}

/**
 * Wraps a data array and total count into a typed paginated response.
 */
export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  params: PaginationParams,
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / params.pageSize);
  return {
    data,
    total,
    page:       params.page,
    pageSize:   params.pageSize,
    totalPages,
    hasNext:    params.page < totalPages,
    hasPrev:    params.page > 1,
  };
}
