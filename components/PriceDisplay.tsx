"use client";

// components/PriceDisplay.tsx — a small client island for showing a
// currency-converted price inside an otherwise server-rendered
// component (ProductCard.tsx is the one case today: it isn't "use
// client" itself, and useCurrency() needs to be). Same pattern
// already used for WishlistButton inside that same card — one small
// interactive/reactive piece, not the whole card.
import { useCurrency } from "@/context/CurrencyContext";

export default function PriceDisplay({ amountUsd }: { amountUsd: number }) {
  const { formatPrice } = useCurrency();
  return <>{formatPrice(amountUsd)}</>;
}
