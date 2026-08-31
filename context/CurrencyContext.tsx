"use client";

// ============================================================
// context/CurrencyContext.tsx — the site-wide currency selection.
// Same shape as ShipCountryContext: persisted to localStorage,
// hydrated once on mount. formatPrice() is what every price display
// in the app should call instead of a raw `$${amount.toFixed(2)}` —
// see currencyData.ts for the (demo, approximate) conversion rates.
// ============================================================
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CURRENCIES, DEFAULT_CURRENCY_CODE, type CurrencyInfo } from "./currencyData";

interface CurrencyContextValue {
  currency: CurrencyInfo;
  setCurrencyCode: (code: string) => void;
  /** Converts a USD amount (how every price in the catalog is stored)
   * into the selected currency and formats it, symbol included. */
  formatPrice: (usdAmount: number) => string;
  /** Same conversion as formatPrice, but the raw number — no symbol,
   * no formatting. For an editable numeric field (QuoteRequestDialog's
   * target-price input) that needs the converted VALUE, not a display
   * string. */
  convert: (usdAmount: number) => number;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);
const STORAGE_KEY = "currency-code";

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [code, setCode] = useState(DEFAULT_CURRENCY_CODE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // One-time sync from localStorage on mount — see CartContext for
      // why this can't be lazy initial state (no localStorage on the
      // server).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw && CURRENCIES.some((c) => c.code === raw)) setCode(raw);
    } catch {
      // Corrupt or inaccessible storage — stay on the USD default.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, code);
  }, [code, hydrated]);

  const currency = useMemo(() => CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0], [code]);

  const convert = useCallback((usdAmount: number) => usdAmount * currency.rate, [currency]);

  const formatPrice = useCallback(
    (usdAmount: number) => {
      const converted = convert(usdAmount);
      return `${currency.symbol}${converted.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    },
    [currency, convert]
  );

  const value = useMemo(
    () => ({ currency, setCurrencyCode: setCode, formatPrice, convert }),
    [currency, formatPrice, convert]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within a CurrencyProvider");
  return ctx;
}
