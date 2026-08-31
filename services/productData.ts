// ============================================================
// services/productData.ts — product catalog, categories, and
// supplier data ported from the original shop-data.js
// ============================================================
import type {
  Product,
  CategoryKey,
  CategoryAttributes,
  Supplier,
  ShipCountry,
  ProductSpecs,
} from "@/types/product";

export const CATEGORY_ATTRIBUTES: Record<CategoryKey, CategoryAttributes> = {
  "automobiles": {
    brands:   ["RimCraft", "RoadEye", "SeatGuard", "AutoMax", "DrivePro"],
    features: ["Weatherproof", "Universal Fit", "Quick Install", "Night Vision", "Shockproof"],
  },
  "clothes-and-wear": {
    brands:   ["UrbanWear", "DenimCo", "WinterLine", "StyleHouse", "FashionEdge"],
    features: ["Cotton Fabric", "Machine Washable", "Slim Fit", "Breathable", "Stretch Fit"],
  },
  "home-interiors": {
    brands:   ["ComfortLine", "GlowHome", "KitchenPro", "HomeEssence", "LivingCraft"],
    features: ["Eco-friendly", "Foldable", "Adjustable Height", "Easy Assembly", "Energy Efficient"],
  },
  "computer-and-tech": {
    brands:   ["Samsung", "Apple", "Huawei", "Poco", "Lenovo"],
    features: ["Metallic", "Plastic cover", "8GB Ram", "Super power", "Large Memory"],
  },
  "tools-equipments": {
    brands:   ["DrillMaster", "ToolBoxCo", "PowerFix", "GripTech", "BuildPro"],
    features: ["Cordless", "Heavy Duty", "Rechargeable Battery", "Ergonomic Grip", "Rust Resistant"],
  },
  "sports-and-outdoor": {
    brands:   ["CampPro", "FlexFit", "TrailBlazer", "PeakGear", "ActiveEdge"],
    features: ["Waterproof", "Lightweight", "Quick Setup", "Non-slip", "UV Resistant"],
  },
  "animal-and-pets": {
    brands:   ["PawTravel", "PetComfort", "FurryFriend", "WagWell", "PawsCo"],
    features: ["Breathable", "Portable", "Machine Washable", "Durable Stitching", "Adjustable Straps"],
  },
  "machinery-tools": {
    brands:   ["IndusPower", "MegaForce", "HeavyDutyCo", "ProMachine", "IronWorks"],
    features: ["Heavy-duty", "High Voltage", "Industrial Grade", "Low Maintenance", "High Efficiency"],
  },
  "gift-boxes": {
    brands:   ["GiftCraft", "WrapEase", "CelebrationCo", "ThoughtfulGifts", "PresentPro"],
    features: ["Ribbon Included", "Reusable Box", "Personalized Card", "Eco-friendly Packaging", "Assorted Items"],
  },
};


// Override for the catalog's deliberately bottom-tier items (its name
// says "Basic"/"Budget"/"Simple" — that's the signal used to pick which
// products get this, rather than a subjective price cutoff). These are
// cheap, no-frills commodity items; inheriting the category-wide
// defaults verbatim (e.g. a manufacturer warranty + OEM logo printing on
// a $3.50 pair of earphones) would overclaim what a listing like this
// realistically offers. See getSpecs() in productService.ts for how a
// product's own `specs` take priority over CATEGORY_SPEC_DEFAULTS.
const BUDGET_ITEM_SPECS: Partial<ProductSpecs> = {
  customization: "Not available for this item",
  protection: "No extended protection specified for this item",
  warranty: "N/A",
};

export const PRODUCTS: Product[] = [
  // ================= AUTOMOBILES =================
  { id: "auto-1", category: "automobiles", name: "Alloy Wheel Rim Set 17-inch", price: 240.00, oldPrice: 280.00, img: "/images/automobile/alloy-wheel.webp", rating: 4, orders: 88,  desc: "Lightweight alloy wheel rims, set of 4, fits most sedans and SUVs.", verified: true,  condition: "refurbished", brand: "RimCraft", features: ["Weatherproof", "Shockproof"] },
  { id: "auto-2", category: "automobiles", name: "Car Dash Camera Full HD",     price:  59.99, img: "/images/automobile/dash-car-camera.webp", rating: 5, orders: 210, desc: "1080p dash cam with night vision and loop recording.", verified: true,  condition: "brand-new",   brand: "RoadEye",  features: ["Night Vision", "Quick Install"] },
  { id: "auto-4", category: "automobiles", name: "LED Headlight Bulb Kit",     price:  45.00, img: "/images/automobile/car-headlight.webp", rating: 4, orders: 120, desc: "Bright LED headlight replacement kit, plug-and-play installation.", verified: true, condition: "brand-new", brand: "AutoMax", features: ["Quick Install", "Night Vision"] },
  { id: "auto-5", category: "automobiles", name: "Car Phone Mount Holder",     price:  14.99, img: "/images/automobile/Car-phone-mount.webp", rating: 4, orders: 300, desc: "Sturdy dashboard phone mount, fits all smartphone sizes.", verified: true, condition: "brand-new", brand: "DrivePro", features: ["Universal Fit", "Shockproof"] },
  { id: "auto-6", category: "automobiles", name: "Tire Pressure Monitoring System", price: 89.00, img: "/images/automobile/Tire-Pressure-monitoring-system.webp", rating: 5, orders: 75, desc: "Real-time tire pressure monitoring with wireless sensors.", verified: true, condition: "brand-new", brand: "RimCraft", features: ["Weatherproof", "Night Vision"] },
  { id: "auto-7", category: "automobiles", name: "Car Sun Shade Foldable", price: 9.99, img: "/images/automobile/car-sunshine-foldable.webp", rating: 2, orders: 40, desc: "Foldable windshield sun shade, blocks heat and UV rays.", verified: true, condition: "brand-new", brand: "SeatGuard", features: ["Universal Fit", "Quick Install"] },
  { id: "auto-8", category: "automobiles", name: "Budget Car Floor Mats", price: 12.50, img: "/images/automobile/car-tail-light.webp", rating: 1, orders: 15, desc: "Basic all-weather rubber floor mats, set of 4.", verified: false, condition: "old", brand: "AutoMax", features: ["Universal Fit", "Weatherproof"], specs: BUDGET_ITEM_SPECS },

  // ================= CLOTHES AND WEAR =================
  { id: "cloth-1", category: "clothes-and-wear", name: "T-shirts with multiple colors, for men", price: 10.30, img: "/images/cloth/Bitmap.webp",     rating: 4, orders: 154, desc: "Soft cotton t-shirt available in multiple colors and sizes.", verified: true,  condition: "brand-new", brand: "UrbanWear",  features: ["Cotton Fabric", "Breathable"] },
  { id: "cloth-2", category: "clothes-and-wear", name: "Brown winter coat medium size",           price: 10.30, img: "/images/cloth/2 1.webp",        rating: 5, orders: 98,  desc: "Warm winter coat, medium size, brown color.", verified: true,  condition: "brand-new", brand: "WinterLine", features: ["Machine Washable", "Slim Fit"] },
  { id: "cloth-3", category: "clothes-and-wear", name: "Coat for men blue color",                 price: 10.50, img: "/images/cloth/image 30.webp",   rating: 4, orders: 76,  desc: "Stylish blue coat for men, classic fit.", verified: false, condition: "old", brand: "UrbanWear", features: ["Slim Fit", "Breathable"] },
  { id: "cloth-4", category: "clothes-and-wear", name: "Jeans shorts for men blue color",         price:  9.99, img: "/images/cloth/Bitmap (2).webp", rating: 3, orders: 40,  desc: "Comfortable denim shorts for everyday wear.", verified: true,  condition: "brand-new", brand: "DenimCo", features: ["Stretch Fit", "Cotton Fabric"] },
  { id: "cloth-5", category: "clothes-and-wear", name: "Leather wallets", price: 18.50, img: "/images/cloth/image 24.webp", rating: 5, orders: 112, desc: "Lightweight floral dress, perfect for summer outings.", verified: true, condition: "brand-new", brand: "StyleHouse", features: ["Breathable", "Machine Washable"] },
  { id: "cloth-6", category: "clothes-and-wear", name: "Cotton Bagpack", price: 16.00, img: "/images/cloth/image 26.webp", rating: 4, orders: 85, desc: "Crisp formal shirt with a tailored slim fit.", verified: true, condition: "brand-new", brand: "FashionEdge", features: ["Slim Fit", "Cotton Fabric"] },
  { id: "cloth-7", category: "clothes-and-wear", name: "Basic Cotton Socks Pack", price: 5.99, img: "/images/cloth/cotton-socks.webp", rating: 2, orders: 60, desc: "Pack of 5 plain cotton socks, one size fits most.", verified: true, condition: "brand-new", brand: "DenimCo", features: ["Cotton Fabric", "Machine Washable"], specs: BUDGET_ITEM_SPECS },

  // ================= HOME INTERIORS =================
  { id: "home-1", category: "home-interiors", name: "Soft chairs",    price:  19.00, img: "/images/interior/1.webp", rating: 4, orders: 55,  desc: "Comfortable soft chair, great for living rooms.", verified: true,  condition: "brand-new", brand: "ComfortLine", features: ["Foldable", "Eco-friendly"] },
  { id: "home-2", category: "home-interiors", name: "Bedroom Lamp",   price:  19.00, img: "/images/interior/6.webp", rating: 4, orders: 33,  desc: "Modern bedroom lamp with warm lighting.", verified: true,  condition: "refurbished", brand: "GlowHome", features: ["Energy Efficient", "Eco-friendly"] },
  { id: "home-3", category: "home-interiors", name: "Kitchen mixer",  price: 100.00, img: "/images/interior/9.webp", rating: 5, orders: 122, desc: "Powerful kitchen mixer for all your baking needs.", verified: true,  condition: "brand-new", brand: "KitchenPro", features: ["Easy Assembly", "Energy Efficient"] },
  { id: "home-4", category: "home-interiors", name: "Blenders",       price:  39.00, img: "/images/interior/8.webp", rating: 4, orders: 70,  desc: "High-speed blender for smoothies and more.", verified: false, condition: "brand-new", brand: "KitchenPro", features: ["Easy Assembly", "Eco-friendly"] },
  { id: "home-5", category: "home-interiors", name: "Adjustable Standing Desk", price: 150.00, img: "/images/interior/standing-desk.webp", rating: 4, orders: 60, desc: "Height-adjustable standing desk for a healthier workspace.", verified: true, condition: "brand-new", brand: "HomeEssence", features: ["Adjustable Height", "Easy Assembly"] },
  { id: "home-6", category: "home-interiors", name: "Foldable Storage Ottoman", price: 25.00, img: "/images/interior/storage-ottoman.webp", rating: 4, orders: 45, desc: "Multi-purpose foldable ottoman with hidden storage.", verified: true, condition: "brand-new", brand: "LivingCraft", features: ["Foldable", "Eco-friendly"] },
  { id: "home-7", category: "home-interiors", name: "Plastic Storage Bin", price: 8.99, img: "/images/interior/plastic-storage-bin.webp", rating: 2, orders: 50, desc: "Stackable plastic storage bin with lid.", verified: true, condition: "brand-new", brand: "HomeEssence", features: ["Foldable", "Eco-friendly"] },

  // ================= COMPUTER AND TECH =================
  { id: "tech-1", category: "computer-and-tech", name: "Laptops",                            price: 340.00, oldPrice: 400.00, img: "/images/tech/laptop.webp",        rating: 5, orders: 300, desc: "Reliable laptop for work and everyday use.", hot: true, verified: true,  condition: "refurbished", brand: "Lenovo",  features: ["8GB Ram", "Large Memory"] },
  { id: "tech-2", category: "computer-and-tech", name: "Smart watches",                       price:  19.00, oldPrice:  25.00, img: "/images/tech/watch.webp",         rating: 4, orders: 154, desc: "Feature-packed smart watch with health tracking.", hot: true, verified: true,  condition: "brand-new",   brand: "Apple",   features: ["Metallic"] },
  { id: "tech-3", category: "computer-and-tech", name: "Headphones",                          price:  10.00, oldPrice:  13.00, img: "/images/tech/white-headphone.webp",rating: 4, orders: 200, desc: "Comfortable over-ear headphones with rich sound.", hot: true, verified: true,  condition: "brand-new",   brand: "Samsung", features: ["Plastic cover"] },
  { id: "tech-4", category: "computer-and-tech", name: "Canon EOS 2000, Black 10x zoom",     price: 998.00, oldPrice:1128.00, img: "/images/tech/Canon-camera.webp",  rating: 4, orders: 154, desc: "Canon EOS 2000 DSLR camera, 10x zoom, black.", hot: true, verified: true,  condition: "brand-new",   brand: "Poco",    features: ["Metallic", "Super power"] },
  { id: "tech-5", category: "computer-and-tech", name: "GoPro HERO6 4K Action Camera", price: 920.00, oldPrice:1533.00, img: "/images/tech/gopro-camera.webp",  rating: 5, orders: 164, desc: "4K action camera, perfect for adventures.", hot: true, verified: true,  condition: "brand-new",   brand: "Huawei",  features: ["Super power", "Plastic cover"] },
  { id: "tech-6", category: "computer-and-tech", name: "Electric kettle", price: 240.00, oldPrice:1533.00, img: "/images/tech/USB.webp", rating: 4, orders: 60,  desc: "Fast-boiling electric kettle, 1.7L capacity.",  hot: true, verified: false, condition: "old",  brand: "Samsung", features: ["Super power", "Metallic"] },
  { id: "tech-7", category: "computer-and-tech", name: "Budget USB-C Cable", price: 4.99, img: "/images/tech/USB.webp", rating: 2, orders: 90, desc: "1-meter USB-C charging and data cable.", verified: true, condition: "brand-new", brand: "Poco", features: ["Plastic cover"], specs: BUDGET_ITEM_SPECS },
  { id: "tech-8", category: "computer-and-tech", name: "Basic Wired Earphones", price: 3.50, img: "/images/tech/USB.webp", rating: 1, orders: 35, desc: "Entry-level wired earphones with in-line mic.", verified: false, condition: "old", brand: "Samsung", features: ["Plastic cover"], specs: BUDGET_ITEM_SPECS },

  // ================= TOOLS & EQUIPMENTS =================
  { id: "tool-1", category: "tools-equipments", name: "Cordless Drill Set",    price: 65.00, img: "/images/tools/cordless-drill-set.webp", rating: 4, orders: 45, desc: "Cordless drill with multiple bits, rechargeable battery.", verified: true, condition: "brand-new", brand: "DrillMaster", features: ["Cordless", "Rechargeable Battery"] },
  { id: "tool-2", category: "tools-equipments", name: "Tool Box Organizer",    price: 28.00, img: "/images/tools/tool-box-organizer.webp",    rating: 4, orders: 30, desc: "Sturdy multi-compartment tool box organizer.", verified: true, condition: "brand-new", brand: "ToolBoxCo", features: ["Heavy Duty", "Rust Resistant"] },
  { id: "tool-3", category: "tools-equipments", name: "Adjustable Wrench Set", price: 22.00, img: "/images/tools/wrench-set.webp", rating: 4, orders: 58, desc: "Set of adjustable wrenches for home and workshop use.", verified: true, condition: "brand-new", brand: "PowerFix", features: ["Ergonomic Grip", "Rust Resistant"] },
  { id: "tool-4", category: "tools-equipments", name: "Angle Grinder 4-inch",  price: 48.00, img: "/images/tools/angle-grinder.webp", rating: 5, orders: 77, desc: "Compact angle grinder for cutting and grinding metal.", verified: true, condition: "brand-new", brand: "GripTech", features: ["Heavy Duty", "Ergonomic Grip"] },
  { id: "tool-5", category: "tools-equipments", name: "Heavy Duty Work Gloves", price: 12.00, img: "/images/tools/gloves.webp", rating: 4, orders: 90, desc: "Durable work gloves with reinforced grip padding.", verified: true, condition: "brand-new", brand: "DrillMaster", features: ["Heavy Duty", "Rust Resistant"] },
  { id: "tool-6", category: "tools-equipments", name: "Basic Tape Measure", price: 4.50, img: "/images/tools/tape-measure.webp", rating: 2, orders: 70, desc: "5-meter retractable tape measure.", verified: true, condition: "brand-new", brand: "ToolBoxCo", features: ["Rust Resistant"], specs: BUDGET_ITEM_SPECS },

  // ================= SPORTS AND OUTDOOR =================
  { id: "sport-1", category: "sports-and-outdoor", name: "Camping Tent 4-Person", price: 89.00, img: "/images/sports/camping-tent.webp", rating: 5, orders: 52, desc: "Waterproof 4-person camping tent, easy setup.", verified: true, condition: "brand-new", brand: "CampPro", features: ["Waterproof", "Quick Setup"] },
  { id: "sport-2", category: "sports-and-outdoor", name: "Yoga Mat Non-Slip",     price: 15.00, img: "/images/sports/yoga-mat.webp", rating: 4, orders: 90, desc: "Extra thick, non-slip yoga mat.", verified: true, condition: "brand-new", brand: "FlexFit", features: ["Non-slip", "Lightweight"] },
  { id: "sport-3", category: "sports-and-outdoor", name: "Hiking Backpack 40L", price: 55.00, img: "/images/sports/hiking-bagpack.webp", rating: 5, orders: 110, desc: "Durable 40L hiking backpack with multiple compartments.", verified: true, condition: "brand-new", brand: "TrailBlazer", features: ["Lightweight", "Waterproof"] },
  { id: "sport-4", category: "sports-and-outdoor", name: "Insulated Water Bottle", price: 18.00, img: "/images/sports/water-bottle.webp", rating: 4, orders: 200, desc: "Double-wall insulated bottle keeps drinks cold for 24 hours.", verified: true, condition: "brand-new", brand: "PeakGear", features: ["Lightweight", "UV Resistant"] },
  { id: "sport-5", category: "sports-and-outdoor", name: "Resistance Bands Set", price: 12.50, img: "/images/sports/band-sets.webp", rating: 4, orders: 140, desc: "Set of 5 resistance bands for home workouts.", verified: true, condition: "brand-new", brand: "ActiveEdge", features: ["Non-slip", "Lightweight"] },
  { id: "sport-6", category: "sports-and-outdoor", name: "Basic Jump Rope", price: 5.99, img: "/images/sports/skipping-rope.webp", rating: 2, orders: 55, desc: "Adjustable-length jump rope for cardio workouts.", verified: true, condition: "brand-new", brand: "ActiveEdge", features: ["Lightweight"], specs: BUDGET_ITEM_SPECS },

  // ================= ANIMAL AND PETS =================
  { id: "pet-1", category: "animal-and-pets", name: "Dog Leash with Padded Handle", price: 14.00, img: "/images/animals/dog-leash.webp",
  gallery: [
    "/images/animals/dog-leash.webp",
    "/images/animals/dog-leash-primary-product-2.webp",
    "/images/animals/Dog-leash-lifestyle-shot.webp",
    "/images/animals/Dog-leash feature-focus .webp",
    "/images/animals/dog-leash-primary-product-1.webp"
  ],
  rating: 5, orders: 70, desc: "Comfortable padded leash for medium to large dogs.", verified: true, condition: "brand-new", brand: "PetComfort", features: ["Adjustable Straps", "Durable Stitching"] },
  { id: "pet-3", category: "animal-and-pets", name: "Cat Scratching Post Tower", price: 38.00, img: "/images/animals/post-tower.webp",
    gallery: [
    "/images/animals/post-tower.webp",
    "/images/animals/Post-tower lifestyle-shot.webp",
    "/images/animals/Post-tower close-up-shot.webp",
    "/images/animals/Post-tower functional-shot.webp",
    "/images/animals/post-tower-components.webp"
  ],
   rating: 4, orders: 54, desc: "Multi-level scratching post with cozy perch.", verified: true, condition: "brand-new", brand: "FurryFriend", features: ["Durable Stitching", "Portable"] },
  { id: "pet-4", category: "animal-and-pets", name: "Pet Bed Soft Cushion", price: 25.00, img: "/images/animals/pet-cushion.webp",
    gallery: [
    "/images/animals/pet-cushion.webp",
    "/images/animals/Pet-bed 1.webp",
    "/images/animals/Pet-bed 2.webp",
    "/images/animals/Pet-bed 3.webp",
    "/images/animals/Pet-bed 4.webp",
    "/images/animals/Pet-bed 5.webp",
    "/images/animals/Pet-bed 6.webp"
  ],
   rating: 4, orders: 66, desc: "Plush pet bed with removable, washable cover.", verified: true, condition: "brand-new", brand: "WagWell", features: ["Machine Washable", "Breathable"] },
  { id: "pet-5", category: "animal-and-pets", name: "Automatic Pet Feeder", price: 42.00, img: "/images/animals/pet-feeder.webp", rating: 4, orders: 48, desc: "Programmable automatic feeder for cats and small dogs.", verified: true, condition: "brand-new", brand: "PawsCo", features: ["Portable", "Adjustable Straps"] },
  { id: "pet-6", category: "animal-and-pets", name: "Dog Harness Adjustable", price: 16.50, img: "/images/animals/pet-feeder.webp", rating: 5, orders: 88, desc: "No-pull dog harness with adjustable, breathable straps.", verified: false, condition: "brand-new", brand: "PawTravel", features: ["Adjustable Straps", "Breathable"] },
  { id: "pet-7", category: "animal-and-pets", name: "Basic Pet Bowl", price: 4.99, img: "/images/animals/pet-bowl.webp", rating: 2, orders: 45, desc: "Simple stainless steel pet food bowl.", verified: true, condition: "brand-new", brand: "PawsCo", features: ["Portable"], specs: BUDGET_ITEM_SPECS },

  // ================= MACHINERY TOOLS =================
  { id: "mach-1", category: "machinery-tools", name: "Industrial Air Compressor", price: 450.00, img: "/images/tools/air-compressor.webp", rating: 4, orders: 12, desc: "Heavy-duty air compressor for workshop use.", verified: true, condition: "refurbished", brand: "IndusPower", features: ["Heavy-duty", "Industrial Grade"] },
  { id: "mach-2", category: "machinery-tools", name: "Hydraulic Press Machine", price: 1200.00, img: "/images/tools/Hydraulic-press.webp", rating: 4, orders: 8, desc: "Industrial hydraulic press for metal forming applications.", verified: true, condition: "brand-new", brand: "MegaForce", features: ["High Voltage", "Heavy-duty"] },
  { id: "mach-3", category: "machinery-tools", name: "CNC Router Machine", price: 2500.00, img: "/images/tools/CNC-router-machine.webp", rating: 5, orders: 5, desc: "Precision CNC router for woodworking and fabrication.", verified: true, condition: "brand-new", brand: "HeavyDutyCo", features: ["Industrial Grade", "High Efficiency"] },
  { id: "mach-4", category: "machinery-tools", name: "Industrial Vacuum Cleaner", price: 320.00, img: "/images/tools/vacuum-cleaner.webp", rating: 4, orders: 20, desc: "Heavy-duty vacuum for industrial and warehouse cleaning.", verified: true, condition: "brand-new", brand: "ProMachine", features: ["Low Maintenance", "High Efficiency"] },
  { id: "mach-5", category: "machinery-tools", name: "Conveyor Belt System", price: 950.00, img: "/images/tools/conveyor-belt.webp", rating: 4, orders: 9, desc: "Modular conveyor belt system for production lines.", verified: true, condition: "brand-new", brand: "IndusPower", features: ["Industrial Grade", "Heavy-duty"] },
  { id: "mach-7", category: "machinery-tools", name: "Basic Hand Trolley", price: 45.00, img: "/images/tools/hand-trolley.webp", rating: 2, orders: 30, desc: "Foldable hand trolley, 150kg capacity.", verified: true, condition: "brand-new", brand: "ProMachine", features: ["Low Maintenance"], specs: BUDGET_ITEM_SPECS },

  // ================= GIFT BOXES =================
  { id: "gift-1", category: "gift-boxes", name: "Deluxe Gift Box Set",         price: 24.99, img: "/images/interior/deluxe-giftset.webp",     rating: 5, orders: 40, desc: "Elegant gift box set with ribbon, perfect for any occasion.", verified: true, condition: "brand-new", brand: "GiftCraft", features: ["Ribbon Included", "Reusable Box"] },
  { id: "gift-2", category: "gift-boxes", name: "Chocolate Gift Hamper",       price: 32.00, img: "/images/interior/gift-hamper.webp",     rating: 4, orders: 25, desc: "Assorted chocolate hamper, beautifully packaged for gifting.", verified: true, condition: "brand-new", brand: "WrapEase", features: ["Assorted Items", "Eco-friendly Packaging"] },
  { id: "gift-3", category: "gift-boxes", name: "Luxury Gift Wrap Bundle",     price: 15.50, img: "/images/interior/gift-wrap.webp", rating: 4, orders: 18, desc: "Premium gift wrapping paper, ribbon and tags bundle.", verified: true, condition: "brand-new", brand: "CelebrationCo", features: ["Ribbon Included", "Eco-friendly Packaging"] },
  { id: "gift-4", category: "gift-boxes", name: "Birthday Surprise Gift Box",  price: 27.75, img: "/images/interior/gift-surprise.webp",     rating: 5, orders: 33, desc: "Curated birthday gift box with candles, card and treats.", verified: true, condition: "brand-new", brand: "ThoughtfulGifts", features: ["Personalized Card", "Assorted Items"] },
  { id: "gift-5", category: "gift-boxes", name: "Anniversary Gift Hamper",     price: 45.00, img: "/images/interior/anniversary-hamper.webp",     rating: 5, orders: 22, desc: "Elegant anniversary hamper with keepsake box.", verified: true, condition: "brand-new", brand: "PresentPro", features: ["Personalized Card", "Reusable Box"] },
  { id: "gift-6", category: "gift-boxes", name: "Simple Gift Bag", price: 3.99, img: "/images/interior/gift-bag.webp", rating: 2, orders: 38, desc: "Plain kraft paper gift bag with handles.", verified: true, condition: "brand-new", brand: "WrapEase", features: ["Eco-friendly Packaging"], specs: BUDGET_ITEM_SPECS },
];


export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  "automobiles":      "Automobiles",
  "clothes-and-wear": "Clothes and wear",
  "home-interiors":   "Home interiors",
  "computer-and-tech":"Computer and tech",
  "tools-equipments": "Tools, equipments",
  "sports-and-outdoor":"Sports and outdoor",
  "animal-and-pets":  "Animal and pets",
  "machinery-tools":  "Machinery tools",
  "gift-boxes":       "Gift boxes",
};


export const SEARCH_TO_CATEGORY: Record<string, CategoryKey> = {
  "electronics":   "computer-and-tech", "electronic": "computer-and-tech", "tech": "computer-and-tech",
  "computer":      "computer-and-tech", "computers": "computer-and-tech", "laptop": "computer-and-tech",
  "laptops":       "computer-and-tech", "phone": "computer-and-tech", "phones": "computer-and-tech",
  "smartphone":    "computer-and-tech", "smartphones": "computer-and-tech", "watch": "computer-and-tech",
  "watches":       "computer-and-tech", "headphone": "computer-and-tech", "headphones": "computer-and-tech",
  "camera":        "computer-and-tech", "cameras": "computer-and-tech", "gadget": "computer-and-tech", "gadgets": "computer-and-tech",
  "fashion":       "clothes-and-wear", "clothes": "clothes-and-wear", "clothing": "clothes-and-wear",
  "wear":          "clothes-and-wear", "shirt": "clothes-and-wear", "shirts": "clothes-and-wear",
  "coat":          "clothes-and-wear", "coats": "clothes-and-wear", "jeans": "clothes-and-wear",
  "home":          "home-interiors", "interior": "home-interiors", "interiors": "home-interiors",
  "furniture":     "home-interiors", "lamp": "home-interiors", "chair": "home-interiors", "chairs": "home-interiors", "kitchen": "home-interiors",
  "automobile":    "automobiles", "automobiles": "automobiles", "car": "automobiles", "cars": "automobiles",
  "vehicle":       "automobiles", "vehicles": "automobiles",
  "sports":        "sports-and-outdoor", "sport": "sports-and-outdoor", "outdoor": "sports-and-outdoor",
  "camping":       "sports-and-outdoor", "yoga": "sports-and-outdoor",
  "tools":         "tools-equipments", "tool": "tools-equipments", "equipment": "tools-equipments",
  "equipments":    "tools-equipments", "drill": "tools-equipments",
  "pets":          "animal-and-pets", "pet": "animal-and-pets", "animal": "animal-and-pets", "animals": "animal-and-pets",
  "machinery":     "machinery-tools", "machine": "machinery-tools", "machines": "machinery-tools",
  "gift":          "gift-boxes", "gifts": "gift-boxes", "giftbox": "gift-boxes", "giftboxes": "gift-boxes",
  "hamper":        "gift-boxes", "hampers": "gift-boxes",
};


export const SUPPLIER_POOL: Record<ShipCountry, Supplier[]> = {
  "Germany": [
    { name: "Guanjoi Trading LLC", initial: "G", color: "#0D6EFD", city: "Berlin",   country: "Germany", flag: "/images/flags/DE@2x.webp", verified: true,  years: 12 },
    { name: "Nordfelt GmbH",       initial: "N", color: "#00B517", city: "Hamburg",  country: "Germany", flag: "/images/flags/DE@2x.webp", verified: true,  years: 8  },
  ],
  "USA": [
    { name: "Liberty Sourcing Inc", initial: "L", color: "#0D6EFD", city: "Chicago, IL",   country: "USA", flag: "/images/flags/US@2x.webp", verified: true,  years: 9  },
    { name: "Summit Trade Co.",     initial: "S", color: "#FF9017", city: "Austin, TX",    country: "USA", flag: "/images/flags/US@2x.webp", verified: false, years: 4  },
  ],
  "UAE": [
    { name: "Al Noor Global Trading", initial: "A", color: "#0D6EFD", city: "Dubai", country: "UAE", flag: "/images/flags/AE@2x.webp", verified: true, years: 11 },
  ],
  "Denmark": [
    { name: "Nordisk Handel ApS", initial: "N", color: "#14B8A6", city: "Copenhagen", country: "Denmark", flag: "/images/flags/DK@2x.webp", verified: true, years: 7 },
  ],
  "Italy": [
    { name: "Casa Forniture Srl", initial: "C", color: "#EC4899", city: "Milan", country: "Italy", flag: "/images/flags/IT@2x.webp", verified: true, years: 15 },
  ],
  "China": [
    { name: "Huaxin Manufacturing Co.", initial: "H", color: "#FA3434", city: "Shenzhen", country: "China", flag: "/images/flags/CN@2x.webp", verified: true,  years: 14 },
    { name: "Jinlong Trading Ltd",      initial: "J", color: "#6366F1", city: "Guangzhou", country: "China", flag: "/images/flags/CN@2x.webp", verified: false, years: 3  },
  ],
  "Russia": [
    { name: "Vostok Supply LLC", initial: "V", color: "#0D6EFD", city: "Moscow", country: "Russia", flag: "/images/flags/RU@2x.webp", verified: true, years: 6 },
  ],
  "Pakistan": [
    { name: "Faisalabad Textile Traders", initial: "F", color: "#01411C", city: "Faisalabad", country: "Pakistan", flag: "/images/flags/PK@2x.webp", verified: true, years: 10 },
  ],
  "Bosnia": [
    { name: "Sarajevo Export d.o.o.", initial: "S", color: "#003893", city: "Sarajevo", country: "Bosnia", flag: "/images/flags/BA@2x.webp", verified: true, years: 6 },
  ],
};


// Wording is deliberately cautious ("may be available"), not a flat
// guarantee — these are category-wide defaults applied to every product
// in the category (see getSpecs() in productService.ts), including
// bottom-tier items like a $3.50 pair of basic wired earphones or a
// $4.50 tape measure. A blanket "OEM/ODM logo printing available" on
// every single computer-and-tech product, regardless of price or
// positioning, overclaims a real capability as though it were verified
// per-product. Genuinely bottom-tier products additionally get a
// specific `specs` override on their catalog entry below instead of
// inheriting this at all — see the "Basic"/"Budget"/"Simple"-named
// products in PRODUCTS (e.g. tech-7, tech-8, auto-8).
export const CATEGORY_SPEC_DEFAULTS: Record<CategoryKey, ProductSpecs> = {
  "automobiles":        { type: "Automotive accessory",  material: "Reinforced composite / alloy",        design: "Universal fit, durable finish",        customization: "Custom branding may be available for bulk orders", protection: "14-day return policy",           warranty: "1 year" },
  "clothes-and-wear":   { type: "Apparel",                material: "Cotton blend fabric",                 design: "Classic tailored fit",                 customization: "Custom sizing, labels & packaging may be available for bulk orders", protection: "14-day return policy",      warranty: "N/A" },
  "home-interiors":     { type: "Home & living item",     material: "Engineered wood / metal / fabric mix", design: "Contemporary minimalist",              customization: "Color & finish options may be available for bulk orders",    protection: "30-day return policy",       warranty: "1 year" },
  "computer-and-tech":  { type: "Consumer electronics",   material: "Metal & plastic composite",           design: "Modern ergonomic design",              customization: "OEM/ODM branding may be available for bulk orders",          protection: "Manufacturer warranty + refund policy", warranty: "1–2 years" },
  "tools-equipments":   { type: "Hand / power tool",      material: "Hardened steel, composite grip",      design: "Ergonomic, heavy-duty build",          customization: "Custom branding may be available for bulk orders",                 protection: "14-day return policy",       warranty: "2 years" },
  "sports-and-outdoor": { type: "Sports & outdoor gear",  material: "Weather-resistant technical fabric",  design: "Lightweight, performance-focused",     customization: "Custom colors may be available for bulk orders",              protection: "14-day return policy",       warranty: "1 year" },
  "animal-and-pets":    { type: "Pet accessory",          material: "Durable, washable fabric",            design: "Adjustable, pet-friendly",             customization: "Size & color options may be available for bulk orders",      protection: "14-day return policy",       warranty: "6 months" },
  "machinery-tools":    { type: "Industrial machinery",   material: "Industrial-grade steel",              design: "Heavy-duty industrial build",          customization: "Custom specifications may be available for bulk orders",     protection: "Factory inspection before shipping", warranty: "2 years" },
  "gift-boxes":         { type: "Gift packaging",         material: "Premium paper / reusable box",        design: "Elegant presentation",                 customization: "Personalized cards & wrapping may be available for bulk orders",             protection: "14-day return policy",       warranty: "N/A" },
};


export const REVIEW_TEMPLATES: Record<number, string[]> = {
  5: ["Excellent quality, exactly as described.", "Fast shipping and premium material.", "Highly recommend this seller."],
  4: ["Very satisfied with the purchase.", "Good value for the price.", "Works well, minor packaging issue."],
  3: ["Decent product, does the job.", "Average quality but acceptable for the price.", "Shipping took longer than expected."],
  2: ["Below expectations, quality could be better.", "Had some issues on arrival, seller was slow to respond."],
  1: ["Not satisfied with this order.", "Would not recommend based on my experience."],
};
