"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addSearchHistoryEntry,
  clearSearchHistory,
  getSearchHistory,
  removeSearchHistoryEntry,
} from "@/services/searchHistoryService";

interface UseSearchHistoryResult {
  history: string[];
  addEntry: (term: string) => void;
  removeEntry: (term: string) => void;
  clearAll: () => void;
}

/** Header search-history state, backed by localStorage (see
 * services/searchHistoryService.ts). Hydrated from storage in an
 * effect, not during render — same pattern every other
 * localStorage-backed piece of state in this app follows, so the
 * server-rendered markup (always empty) matches the client's first
 * render and only fills in after mount. */
export function useSearchHistory(): UseSearchHistoryResult {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory(getSearchHistory());
  }, []);

  const addEntry = useCallback((term: string) => {
    setHistory(addSearchHistoryEntry(term));
  }, []);

  const removeEntry = useCallback((term: string) => {
    setHistory(removeSearchHistoryEntry(term));
  }, []);

  const clearAll = useCallback(() => {
    setHistory(clearSearchHistory());
  }, []);

  return { history, addEntry, removeEntry, clearAll };
}
