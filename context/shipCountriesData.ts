// ============================================================
// context/shipCountriesData.ts — the SHIP_COUNTRIES data itself,
// split out of ShipCountryContext.tsx (which re-exports it, so every
// existing `import { SHIP_COUNTRIES } from "@/context/ShipCountryContext"`
// keeps working unchanged) specifically so a Server Component can
// import it directly instead. ShipCountryContext.tsx has "use client"
// at the top for its Provider/hook; a plain data export importED
// THROUGH that boundary doesn't resolve on the server (Next.js turns
// "use client" module exports into client-reference proxies for RSC
// serialization, which isn't a real array on the server side) — it
// silently produced SHIP_COUNTRIES.length === 0 in app/about/page.tsx
// until this was split out. No "use client" here: just data, safe to
// import from server or client code either way.
// ============================================================
import type { ShipCountry } from "@/types/product";

// flagWidth/flagHeight are each flag file's own real pixel dimensions
// (not a shared guess) — the flag assets aren't all the same aspect
// ratio (DE@2x.webp is 22×16, most others are 28×20, PK/BA@2x.webp are
// 180×130), so a single hardcoded width/height applied to all of them
// would misreport several of their intrinsic ratios to next/image and
// trigger its aspect-ratio console warning. DeliverToSelector renders
// them all at the same visual height via CSS instead (see its own
// style prop), so this varying by flag doesn't show up as inconsistent
// sizing on screen — only as a (harmless) slightly different width per
// flag, same as real-world flags themselves aren't uniform proportions.
export const SHIP_COUNTRIES: { value: ShipCountry; flag: string; flagWidth: number; flagHeight: number }[] = [
  { value: "Pakistan", flag: "/images/flags/PK@2x.webp", flagWidth: 180, flagHeight: 130 },
  { value: "Bosnia", flag: "/images/flags/BA@2x.webp", flagWidth: 180, flagHeight: 130 },
  { value: "Germany", flag: "/images/flags/DE@2x.webp", flagWidth: 22, flagHeight: 16 },
  { value: "USA", flag: "/images/flags/US@2x.webp", flagWidth: 28, flagHeight: 20 },
  { value: "UAE", flag: "/images/flags/AE@2x.webp", flagWidth: 28, flagHeight: 20 },
  { value: "Denmark", flag: "/images/flags/DK@2x.webp", flagWidth: 28, flagHeight: 20 },
  { value: "Italy", flag: "/images/flags/IT@2x.webp", flagWidth: 28, flagHeight: 20 },
  { value: "China", flag: "/images/flags/CN@2x.webp", flagWidth: 28, flagHeight: 20 },
  { value: "Russia", flag: "/images/flags/RU@2x.webp", flagWidth: 28, flagHeight: 20 },
];
