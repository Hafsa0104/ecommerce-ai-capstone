// ============================================================
// types/product.ts — shared product & catalog type definitions
// ============================================================

export type CategoryKey =
  | "automobiles"
  | "clothes-and-wear"
  | "home-interiors"
  | "computer-and-tech"
  | "tools-equipments"
  | "sports-and-outdoor"
  | "animal-and-pets"
  | "machinery-tools"
  | "gift-boxes";

export type ProductCondition = "brand-new" | "refurbished" | "old";

export interface PriceTier {
  label: string;
  qtyFrom: number;
  qtyTo: number | null;
  price: number;
}

export interface Review {
  stars: number;
  text: string;
}

// Deliberately no `price` field here — the real price already lives on
// `Product.price`/`priceTiers` and is shown (with a real action, Request
// a Quote) by ProductPurchasePanel. An earlier version of this type had
// a `price: string` spec that getSpecs() always filled with the literal
// "Negotiable" — a claim with no corresponding UI action anywhere. See
// QuoteRequestDialog.tsx for the real interaction that replaced it.
export interface ProductSpecs {
  type: string;
  material: string;
  design: string;
  customization: string;
  protection: string;
  warranty: string;
}

export interface Product {
  id: string;
  category: CategoryKey;
  name: string;
  price: number;
  oldPrice?: number;
  img: string;
  gallery?: string[];
  rating: number;
  orders: number;
  desc: string;
  hot?: boolean;
  verified: boolean;
  condition: ProductCondition;
  brand: string;
  features: string[];
  specs?: Partial<ProductSpecs>;
  priceTiers?: PriceTier[];
  reviews?: Review[];
  reviewCount?: number;
}

export interface CategoryAttributes {
  brands: string[];
  features: string[];
}

export interface Supplier {
  name: string;
  initial: string;
  color: string;
  city: string;
  country: string;
  flag: string;
  verified: boolean;
  years: number;
}

export type ShipCountry = "Germany" | "USA" | "UAE" | "Denmark" | "Italy" | "China" | "Russia" | "Pakistan" | "Bosnia";
