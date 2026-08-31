// ============================================================
// services/searchHistoryService.ts — recent header-search terms,
// persisted to localStorage under a plain (non-account-scoped) key,
// same convention as WishlistContext's "wishlist-items" or
// ShipCountryContext's "ship-country": a browser-local UI convenience,
// not account data, so it isn't keyed per signed-in user the way
// orders/profile are.
// ============================================================

const STORAGE_KEY = "search-history";
const MAX_ENTRIES = 8;

export function getSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

function save(entries: string[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage unavailable (private browsing, quota) — history just
    // won't persist past this page load. Not worth surfacing to the
    // user for a convenience feature like this.
  }
}

/** Adds a term to the front, de-duping case-insensitively and capping
 * the list — same "most recent first, no repeats" shape as a browser
 * or YouTube's own search history. Returns the new list so callers can
 * update their state without a second read. */
export function addSearchHistoryEntry(term: string): string[] {
  const trimmed = term.trim();
  if (!trimmed) return getSearchHistory();
  const deduped = getSearchHistory().filter((t) => t.toLowerCase() !== trimmed.toLowerCase());
  const next = [trimmed, ...deduped].slice(0, MAX_ENTRIES);
  save(next);
  return next;
}

export function removeSearchHistoryEntry(term: string): string[] {
  const next = getSearchHistory().filter((t) => t !== term);
  save(next);
  return next;
}

export function clearSearchHistory(): string[] {
  save([]);
  return [];
}
