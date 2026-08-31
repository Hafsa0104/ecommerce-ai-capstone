"use client";

// ============================================================
// context/ShipCountryContext.tsx — the "Deliver to" selection.
// Persisted like Cart/other contexts. This isn't decorative: the
// selected country is fed into getSupplierForProduct() so changing
// it actually changes which real supplier renders on product pages.
// ============================================================
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ShipCountry } from "@/types/product";
// The data itself lives in a plain (non-"use client") sibling file so
// a Server Component can import it directly — see that file's own
// comment for why importing it FROM here doesn't work for server
// code. Re-exported so every existing
// `import { SHIP_COUNTRIES } from "@/context/ShipCountryContext"`
// elsewhere in the client-side app keeps working unchanged.
import { SHIP_COUNTRIES } from "./shipCountriesData";

export { SHIP_COUNTRIES };

const DEFAULT_COUNTRY: ShipCountry = "Germany";
const STORAGE_KEY = "ship-country";

interface ShipCountryContextValue {
  shipCountry: ShipCountry;
  setShipCountry: (country: ShipCountry) => void;
}

const ShipCountryContext = createContext<ShipCountryContextValue | undefined>(undefined);

export function ShipCountryProvider({ children }: { children: ReactNode }) {
  const [shipCountry, setShipCountryState] = useState<ShipCountry>(DEFAULT_COUNTRY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw && SHIP_COUNTRIES.some((c) => c.value === raw)) setShipCountryState(raw as ShipCountry);
    } catch {
      // Corrupt/inaccessible storage — fall back to the default.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, shipCountry);
  }, [shipCountry, hydrated]);

  const value = useMemo(
    () => ({ shipCountry, setShipCountry: setShipCountryState }),
    [shipCountry]
  );

  return <ShipCountryContext.Provider value={value}>{children}</ShipCountryContext.Provider>;
}

export function useShipCountry(): ShipCountryContextValue {
  const ctx = useContext(ShipCountryContext);
  if (!ctx) throw new Error("useShipCountry must be used within a ShipCountryProvider");
  return ctx;
}
