// ============================================================
// context/currencyData.ts — one currency per Deliver-to country
// (see SHIP_COUNTRIES in shipCountriesData.ts), so "Deliver to" and
// the currency selector always offer the same set of countries. No
// "use client" here — plain data, safe to import from server or
// client code (same reasoning as shipCountriesData.ts).
//
// Rates are approximate, fixed demo values (relative to 1 USD), not a
// live feed — there's no FX-rate API in this project. Every price in
// the product catalog is stored in USD; CurrencyContext.formatPrice
// converts from that at render time. Symbol-first, 2 decimal places,
// en-US grouping for every currency — not each currency's own real
// locale convention (comma/period placement varies, e.g. de-DE) —
// consistent and readable is the goal here, not locale-perfect
// formatting.
// ============================================================
import type { ShipCountry } from "@/types/product";

export interface CurrencyInfo {
  code: string;
  symbol: string;
  /** How many units of this currency equal 1 USD. */
  rate: number;
}

export const COUNTRY_CURRENCY: Record<ShipCountry, CurrencyInfo> = {
  Pakistan: { code: "PKR", symbol: "Rs", rate: 278 },
  Bosnia: { code: "BAM", symbol: "KM", rate: 1.8 },
  Germany: { code: "EUR", symbol: "€", rate: 0.92 },
  USA: { code: "USD", symbol: "$", rate: 1 },
  UAE: { code: "AED", symbol: "AED", rate: 3.67 },
  Denmark: { code: "DKK", symbol: "kr", rate: 6.85 },
  Italy: { code: "EUR", symbol: "€", rate: 0.92 },
  China: { code: "CNY", symbol: "¥", rate: 7.24 },
  Russia: { code: "RUB", symbol: "₽", rate: 92 },
};

// Deduplicated by currency code, in SHIP_COUNTRIES order (Germany and
// Italy both use EUR — only listed once) — this is what the currency
// selector itself renders as its options.
export const CURRENCIES: CurrencyInfo[] = Object.values(COUNTRY_CURRENCY).filter(
  (c, i, arr) => arr.findIndex((other) => other.code === c.code) === i
);

export const DEFAULT_CURRENCY_CODE = "USD";
