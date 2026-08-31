# AI-Assisted Development Report — TradeHub

**Author's role:** Developer / owner of this project
**Report scope:** This document is an evidence-based account of how I built and continued to build TradeHub, and specifically how I used Claude (via Claude Code) as an engineering assistant during that work. It is written from a fresh inspection of the current repository, plus the available record of my development sessions with the assistant.

> **How this document was produced.** I had Claude re-inspect the actual project files — `package.json`, `tsconfig.json`, `eslint.config.mjs`, `next.config.ts`, and every directory under `app/`, `components/`, `context/`, `hooks/`, `lib/`, `services/`, `types/`, and `public/` — before writing anything. Every technical claim below is either tied to a specific file/behavior I can point to, or is explicitly marked as something that cannot be confirmed from what currently exists in the repository. I did not let the assistant invent metrics, prompts, or achievements that aren't backed by the code.

---

## 1. Project Overview

**Project name:** TradeHub (see `app/layout.tsx`'s `SITE_NAME` constant).

**Purpose.** TradeHub is a wholesale/B2B-style e-commerce marketplace, not a plain consumer storefront. Its own site description states this directly: *"TradeHub connects buyers with verified suppliers across automobiles, tech, home, tools, and more — browse, compare, and order in bulk with confidence."* The product data model backs this up — `types/product.ts` defines quantity price tiers (`PriceTier`), a supplier-verification flag (`verified: boolean`), and the primary purchase action is "Request a Quote" rather than a simple checkout button, which I built deliberately to match a bulk/wholesale buying pattern instead of a single-item retail one.

**Target users.** Two implied sides of a marketplace: buyers browsing/filtering a wholesale catalog by category, brand, price, condition, and rating; and suppliers who receive quote requests and product inquiries through the messaging feature. There is no seller-facing dashboard in the current codebase — the supplier side is represented (verification badges, supplier cards, contact/inquiry flows) but not a separate authenticated experience.

**Main functionality (verified from `app/`):**

| Route | What it does |
|---|---|
| `/` | Home: category sidebar, hero, deals rail, trending rail |
| `/listing` | Server-rendered filter/sort/search/paginate over the catalog |
| `/product/[id]` | Product detail: gallery, price tiers, specs, reviews, recommendations |
| `/cart` | Client-side cart |
| `/checkout` | Order placement + real, persisted confirmation |
| `/wishlist` | Saved products |
| `/messages` | Buyer→supplier inquiry thread, product-linked |
| `/profile` | Account info, addresses, order history |
| `/sign-in`, `/sign-up` | Full-page auth (in addition to a quick contextual modal) |
| `/about`, `/support` | Informational pages with real computed catalog stats |
| `/api/assistant` | Server-only streaming endpoint for the AI Shopping Assistant |

**Technology stack (verified from `package.json`):**
- Next.js `16.3.3` (App Router, Turbopack)
- React `19.2.8` / `react-dom` `19.2.8`
- TypeScript `^5`, `strict: true` (`tsconfig.json`)
- `lucide-react` for icons
- `react-markdown` — the **only** dependency I added for the entire AI Assistant feature
- ESLint `^9` with `eslint-config-next` (core-web-vitals + TypeScript rule sets)
- No CSS framework, no component library, no state-management library, no AI provider SDK

**Architecture, in one paragraph.** Catalog data lives in one static, hand-authored file (`services/productData.ts` — 59 products, 9 categories, 43 distinct brands, counted directly) accessed through one pure-function service layer (`services/productService.ts`) that has zero React/DOM dependency, so the exact same functions run during server rendering and inside client components without duplicating logic. Pages that primarily display catalog data (`/`, `/listing`, `/product/[id]`) are Server Components using ISR or per-request SSR; interactive, per-visitor state (cart, wishlist, auth, currency, the AI panel) lives in React Context providers composed once in `app/layout.tsx`. Styling is CSS Modules throughout, built on one shared token file (`app/globals.css`).

---

## 2. My Engineering Contributions

I want to be specific here rather than list generic categories, so this section ties each contribution to what actually exists in the repository.

**Features I implemented or extended:**
- A real, persisted order-history system (`services/orderService.ts`) replacing what had been a one-time, non-persisted checkout confirmation.
- Product-linked buyer→supplier messaging — clicking "Send inquiry" on a product now carries that specific product into the message composer (`components/SupplierCard.tsx` → `app/messages/page.tsx`).
- Working footer navigation — the footer previously linked to five pages that 404'd; I built real `/support` and `/about` pages with genuine, computed content (not placeholder text).
- Real currency conversion in the navbar — the language/currency selector existed visually before I made it functional (`context/CurrencyContext.tsx`, `context/currencyData.ts`).
- A brand-new AI Shopping Assistant: a streaming chat panel wired to the real product catalog via tool-calling, built without any AI SDK dependency.
- Product search history and live product suggestions in the navbar (`services/searchHistoryService.ts`, `components/SearchHistoryDropdown.tsx`).
- Brand filtering on the listing page, including category-aware disabling of brands that would produce a guaranteed zero-result combination (`services/productService.ts`'s `getBrandsInCategory`, `components/FilterSidebar.tsx`).
- A mobile hamburger navigation drawer, replacing a header that wrapped across multiple lines and consumed roughly half a phone screen's height (`components/MobileNavDrawer.tsx`).
- A responsive redesign of the sign-in/sign-up pages' showcase panel, including a working glassmorphism "Explore" action tied to a real, trending-sorted category listing.

**UI/UX decisions I made:**
- Keeping Cart as a persistent one-tap icon outside the mobile hamburger drawer, while moving every other account link (Profile, Messages, Orders, Wishlist) into it — a deliberate priority call, not an automatic decision.
- Choosing to *explain* a zero-result filter combination (a visible, red "no products matched X" notice with a fallback to the other active filter) instead of silently showing an empty grid.
- Disabling, rather than hiding, brand filters that don't apply to the selected category, so the sidebar's list stays predictable instead of visually resizing as filters change.
- Deciding the AI Assistant's trigger belongs directly beside the search field in the header (not buried in a menu), because both are discovery features.

**Component architecture:** I kept a consistent shape across the app — a `.tsx` file paired with a `.module.css` file, Context providers paired with a `use*` hook (`useAuth`, `useCart`, `useWishlist`, `useCurrency`, `useAIAssistantUI`/`useAIAssistantChat`), and pure business logic isolated in `services/*.ts` with no React import at all.

**State management:** Context + `localStorage` for anything that needs to persist across a reload (cart, wishlist, auth, search history), all hydrated in a `useEffect` after mount rather than during render — I use this pattern consistently across `CartContext.tsx`, `AuthContext.tsx`, and `WishlistContext.tsx` specifically to avoid a server/client rendering mismatch.

**Routing:** Next.js App Router file-based routing throughout; filter/sort/search state for `/listing` lives entirely in the URL query string rather than client component state, which I chose specifically so every filter combination is bookmarkable and works without JavaScript.

**Authentication:** A mock, honestly-labeled prototype auth system (`context/AuthContext.tsx`, `hooks/useAuthForm.ts`) — no backend, but real validation logic, a local "account book" in `localStorage`, and a security-conscious detail I made a point of getting right: sign-in returns the same generic "Invalid email or password" message whether the email doesn't exist or the password is wrong, so a failed attempt can't be used to enumerate registered emails.

**API integration:** The one real external API integration in this project is the AI Assistant's connection to OpenRouter's chat-completions endpoint (`app/api/assistant/route.ts`), covered in detail in Sections 3, 6, and 8.

**Responsive design:** Two breakpoints used consistently: `56rem` for the header/navigation collapse into the mobile drawer, `64rem` for the auth pages' side-by-side vs. stacked layout switch. Both were tuned and re-tuned based on actually measuring rendered layouts at concrete viewport widths, not guessed once and left alone (Section 7).

**Accessibility:** A skip-link, a global `:focus-visible` ring, an `.sr-only` utility, `prefers-reduced-motion` handling, and a 44px minimum touch-target rule, all defined once in `app/globals.css` and reused everywhere rather than reinvented per component. Full detail in Section 10.

**Performance:** `next/image` throughout with explicit `sizes` on `fill`-mode images, lazy-loading on below-the-fold product cards, ISR on catalog-driven pages, and a Context-splitting pattern in the AI Assistant specifically so the navbar button doesn't re-render on every streamed token. Full detail in Section 11.

**Error / loading / empty states:** A dedicated "no products match these filters" empty state with a "Clear all filters" action; a distinct AI Assistant "thinking" indicator before the first streamed token; explicit, human-readable error messages for a missing API key or an upstream AI failure; per-field validation errors on the auth forms rather than one generic banner.

---

## 3. Technical Architecture

```
app/                    → routes (App Router), each with page.tsx + page.module.css
  api/assistant/         → the one server-only API route (AI Assistant streaming)
  listing/, product/[id]/, cart/, checkout/, messages/, profile/, sign-in/, sign-up/, about/, support/
components/             → .tsx + matching .module.css per component
context/                → React Context providers (Cart, Wishlist, Auth, Currency, ShipCountry, AIAssistant, AuthModal, ConfirmDialog)
hooks/                  → useAuthForm, useDisclosure, useSearchHistory
lib/ai.ts               → AI Assistant model/prompt/tool configuration (ONE place, server-only)
services/               → pure functions, no React/DOM dependency
  productData.ts         → the static catalog itself
  productService.ts      → filtering, sorting, pagination, recommendations, supplier assignment
  orderService.ts        → order persistence
  searchHistoryService.ts→ search-history persistence
types/product.ts        → shared TypeScript types for the catalog
public/images/           → catalog photography, organized per category
```

**Why this structure was appropriate.** The catalog is static demo data, not a live database — putting it behind a pure-function service layer (`services/productService.ts`) rather than scattering `PRODUCTS.filter(...)` calls across components meant every feature I added later (brand filtering, the AI Assistant's tool call, the navbar's live search suggestions, the auth page's trending "Explore" link) could call the *same* filtering logic instead of me re-implementing catalog search four separate times with four separate chances to get it wrong differently each time.

**Data flow (the listing page, as the clearest example):** browser URL query string → `app/listing/page.tsx` parses and validates it into a typed `ListingFilters` object → `services/productService.ts`'s `filterProducts()`/`paginate()` run server-side → fully-formed HTML is returned. There is no client-side filter state for the primary browsing experience at all.

**Component relationships:** Presentational components (`ProductCard`, `FilterSidebar`, `ActiveFilterChips`, `Pagination`) are plain props-in, JSX-out — none of them read a Context directly for filter state; they receive it from the Server Component that owns the URL parsing. Interactive, cross-page state (cart count in the navbar, wishlist heart state on a product card) goes through Context instead, because that state isn't derivable from the URL.

**Client/server boundaries.** `services/productData.ts` and `services/productService.ts` have no `"use client"` directive, so they run on the server (`app/listing/page.tsx`, `app/product/[id]/page.tsx`) and inside client components (`components/CategoryFlyout.tsx`, `components/Navbar.tsx`'s live search) identically. Everything that touches `localStorage` or browser-only state (`CartContext`, `AuthContext`, `WishlistContext`, `hooks/useSearchHistory.ts`) is explicitly `"use client"` and hydrates from storage in a `useEffect`, never during the render that produces server HTML — I chose this specifically to avoid a hydration mismatch between server-rendered markup and the client's first paint.

I also ran into one real framework-boundary bug from this exact split: a plain data constant (`SHIP_COUNTRIES`) that lived inside a `"use client"`-marked context file resolved incorrectly when a Server Component tried to import it, because Next.js treats *every* export of a `"use client"` file as a client-reference proxy, not just component exports. I fixed this by extracting the plain data into its own file with no directive (`context/shipCountriesData.ts`). This is covered in more detail in Section 7.

---

## 4. AI-Assisted Development Process

I used Claude at every stage below, but I want to be precise about what "used" means in each case rather than just saying "AI helped."

**Planning.** For anything beyond a small fix, I had the assistant inspect the existing code first and propose a short plan before writing anything — this was an explicit requirement I set for larger features like the AI Assistant, not the assistant's own default behavior.

**Code generation.** The assistant wrote the first working version of new components, hooks, and service functions, following the conventions already established in the codebase (CSS Modules, the Context+hook pairing, `services/*.ts` staying framework-agnostic). I did not accept this code sight-unseen — see Sections 6 and 9 for specific corrections.

**Debugging.** The assistant proposed hypotheses and, importantly, proposed *instrumented tests* rather than only code changes — direct DOM measurement, raw `curl` requests against the API route, direct `getComputedStyle` queries. Section 7 documents several real bugs this surfaced, including at least one case where the first hypothesis was wrong and had to be disproved before the real cause was found.

**Refactoring.** When I migrated the AI Assistant's provider from Anthropic directly to OpenRouter (Section 6), the assistant re-read and rewrote the entire server-side SSE parser and tool-use loop to match OpenRouter's different (OpenAI-compatible) event shapes, rather than a drop-in swap — I verified the client-facing wire protocol to the browser didn't need to change at all as a result.

**UI/UX iteration.** This was the most iterative category by far. The heart/share icon placement on the product page, the navbar search-field width and spacing, the mobile hamburger menu, and especially the auth pages' showcase panel (breakpoint, image height, thumbnail order, the "Explore" button's glass effect and destination) all went through multiple rounds where I gave specific feedback on an already-implemented detail and had it adjusted again — not accepted on the first pass.

**Accessibility review.** Applying established patterns (roving `tabIndex`, `aria-current`, `aria-expanded`/`aria-controls` pairing, `role="listbox"`/`role="option"`) to new components as I added them, and — critically — finding and fixing a real accessibility/affordance bug that had been sitting in the codebase: the active-thumbnail selection indicator on the auth page's carousel was completely invisible due to a CSS clipping bug (Section 7).

**Performance review.** The Context-splitting decision in the AI Assistant (Section 11) and the `next/image` `sizes` attribute on the auth page's showcase image were both made proactively, before shipping, specifically in response to stated performance requirements — not found and fixed after the fact.

**Documentation.** This report, and the earlier `docs/AI-ASSISTED-DEVELOPMENT-REPORT.md`, were both generated by the assistant from my specification and a fresh repository inspection — I set the ground rules (no fabricated prompts, no invented metrics) and reviewed the result.

---

## 5. AI Prompts / Prompt Patterns

**Exact historical prompts predating my available session record are not preserved** — I did not keep a separate prompt log. I am not going to reconstruct that earlier period as if I had exact quotes for it.

For the portion of development that **is** available in my current session record, the following are real, verbatim prompts I gave — quoted exactly, including my own informal phrasing and typos, not cleaned up:

- *"tell me how user get to know that his order is placed. make proper order"*
- *"make the messages working like user on detail page when click on Send inquiry so he send message to the product supplier that product the one he selected. make proper overflow like real ecommerce alibaba website"*
- *"make my footer links working properly"*
- *"IF PARTICULAR CATEGORY HAS PARTICULAR BRAND ITEMS NOT PRESENT then instead of showing products dont match or exist make those brands disable for that category"*
- *"IMPORTANT CHANGE OF REQUIREMENT — DO NOT USE ANTHROPIC DIRECTLY ... I DO NOT want to pay for any AI API ... I already use OpenRouter and want this project to use OpenRouter's FREE model access."*
- *"no again yet it is not incresed increase it upto 400px"*
- *"firstly add some border radius arounf main image then when i bring mouse over the explore button it all become blue which is not good which hides text change it..."*

**Below is a set of reconstructed, representative prompt patterns** — labeled clearly as patterns I recognize from how I actually worked, not additional exact quotes:

- A feature request stated as a user-facing problem rather than a spec (*"the footer links don't work"* rather than *"implement `/support` and `/about` routes"*).
- A correction referencing a specific already-implemented visual detail to be adjusted again (padding, gap, opacity, a pixel height value).
- A bug report describing observed behavior rather than a proposed fix (*"why does clicking X do Y"*), which required investigation before any code changed.
- A hard constraint stated with a reason attached, mid-project (the OpenRouter cost requirement above), rather than a one-line instruction.

---

## 6. My Judgment and Decision-Making

### Decision: How to handle authentication without a real backend

**Problem.** The app needs sign-in/sign-up gating (wishlist, checkout, reviews) with no backend.

**Approaches considered.** (a) Accept any email/password with no validation. (b) Build a real backend. (c) A local, checkable "account book."

**Approach chosen.** (c) — `hooks/useAuthForm.ts` stores accounts in `localStorage`; sign-in only ever reads, never silently registers a new account.

**Why.** A backend was out of scope for a frontend capstone; no-validation-at-all would make the "Invalid email or password" case impossible to ever trigger honestly.

**Trade-offs.** Real validation behavior without backend cost, at the price of the account only existing in one browser — which I chose to disclose plainly in the UI rather than let it imply real security.

**What I verified manually.** That sign-in genuinely rejects an unrecognized email and a wrong password with the *same* message (not two different messages that would leak which emails exist), by testing both cases directly.

### Decision: `localStorage` hydration timing

**Problem.** Cart/wishlist/auth state must persist, but Server Components render where `localStorage` doesn't exist.

**Approaches considered.** (a) Lazy `useState` initializer reading storage directly. (b) `useEffect`-based hydration with a `hydrated` flag gating the save effect.

**Approach chosen.** (b), applied identically across `CartContext.tsx`, `AuthContext.tsx`, `WishlistContext.tsx`.

**Why.** Option (a) runs during server rendering, where `window` doesn't exist, and would produce a hydration mismatch.

**Trade-offs.** A very brief "empty" flash before the effect runs, in exchange for correctness. The `hydrated` flag specifically prevents the save-effect from firing with an empty array before the load-effect has run — without it, a returning visitor's saved cart could get silently wiped on reload.

**What I verified manually.** I confirmed the lint rule this pattern interacts with (`react-hooks/set-state-in-effect`) — see Section 7 — actually passes cleanly, and that a reload genuinely restores prior cart contents rather than resetting them.

### Decision: Native `<dialog>` for every modal, except the AI Assistant panel

**Problem.** Several features need a real modal (focus trap, Escape-to-close, inert background): product-detail request dialogs, the mobile filter drawer, the mobile nav drawer.

**Approaches considered.** (a) Hand-roll a modal. (b) A third-party dialog library. (c) The native `<dialog>` element and `showModal()`.

**Approach chosen.** (c) for every true modal. For the AI Assistant panel specifically, I chose **not** to reuse this pattern.

**Why.** `showModal()` gives a real focus trap and an inert background for free from the browser. But the AI Assistant panel needs the opposite — the rest of the page must stay scrollable and clickable while it's open — which a modal dialog cannot do by definition. Recognizing that a pattern that had worked three times elsewhere didn't fit this one requirement, instead of forcing it, was my call.

**Trade-offs.** Native `<dialog>` isn't perfectly consistent across engines — see the Tab-wrap issue in Section 7, which required a manual fix I would not have found without actually testing keyboard behavior.

**What I verified manually.** Keyboard Tab-cycling inside a dialog, and that the AI Assistant panel genuinely leaves the background page interactive while open.

### Decision: AI Assistant built on raw `fetch()`, no SDK — then migrated providers mid-project

**Problem.** Add a real streaming AI chat assistant tied to the real catalog, without adding unnecessary dependencies, and — a constraint I added partway through — without ever risking API cost.

**Approaches considered.** (a) The Vercel AI SDK. (b) The provider's own SDK. (c) Raw `fetch()` against the documented HTTP/SSE endpoint. For the provider itself: (i) call Anthropic directly with a paid key, (ii) call OpenRouter and pin one specific free model, (iii) call OpenRouter's own free-model router.

**Approach chosen.** (c) for the implementation approach; (iii) for the provider, after starting on Anthropic directly.

**Why.** `package.json` confirms the *only* dependency I added for this whole feature is `react-markdown` — no AI SDK. For the provider: I explicitly did not want this project to ever require a paid API key, so I switched it to OpenRouter. I chose the free-model *router* (`openrouter/free`) over pinning one specific `:free` model because individual free models on OpenRouter get added/repriced/removed on a rolling basis, and pinning one risks the feature silently breaking later.

**Trade-offs.** More manual code (a hand-written SSE parser and tool-use loop) in exchange for zero new runtime dependencies and full control of the wire format. The free-model router can pick a different underlying model between requests, so response behavior isn't perfectly consistent — a disclosed limitation, not a hidden one.

**What I verified manually.** I fetched OpenRouter's live public model catalog directly and confirmed `openrouter/free` supports `tools`/`tool_choice` (required for the catalog-search feature) at $0 for both prompt and completion tokens, before writing any code against it. I also added a hard runtime guard (`isFreeModelId()` in `lib/ai.ts`, checked on *every* request in `app/api/assistant/route.ts`) so the app refuses to call anything but a free model even if the environment variable is ever misconfigured — this was my own requirement translated into an enforced invariant, not left as a comment.

### Decision: Token-based product search, not whole-string matching

**Problem.** The search placeholder promises "products, brands and more," but a query like "Lenovo laptop" returned zero results even though a matching product existed.

**Approaches considered.** (a) Keep the whole-string substring check. (b) Split the query into words and require each word to appear anywhere across name/description/brand.

**Approach chosen.** (b), in `services/productService.ts`'s `filterProducts()`.

**Why.** Under the old rule, no single field contains the whole two-word phrase "Lenovo laptop" (brand is "Lenovo," name is "Laptops") — they only match together across two different fields, which a single substring check can't see.

**What I verified manually.** I tested `Apple` (single word, already worked), `Lenovo laptop` (failed before, needed to work), `Apple watch` (a real brand+product pair, needed to work), and — importantly — confirmed `Apple laptop` *correctly* still returns zero results after the fix, because this catalog's one Apple product is a smartwatch, not a laptop. Verifying the negative case, not just the positive ones, was the point.

### Decision: Disable, don't hide, brand filters that don't apply

**Problem.** Combining a category and a brand that don't intersect (e.g., "Apple," a tech brand, with "Automobiles" selected) produces a guaranteed empty page.

**Approaches considered.** (a) Do nothing, let the shopper hit the empty state. (b) Hide non-applicable brands from the list. (c) Show every brand always, but render inapplicable ones as disabled with an explanation.

**Approach chosen.** (c).

**Why.** Hiding brands (b) would make the sidebar's list length change unpredictably as a shopper changes categories; a stable list with some entries greyed out and explained is easier to reason about.

**What I verified manually.** That the disabled state is genuinely non-interactive (not just visually dimmed while still clickable), and that switching back to "All categories" re-enables every brand correctly.

---

## 7. Problems, Bugs, and Mistakes Discovered

### RSC boundary bug: `"use client"` export resolving incorrectly on the server

**What happened.** A plain data constant (`SHIP_COUNTRIES`) exported from a file marked `"use client"` resolved to broken/empty data when a Server Component (`app/about/page.tsx`) imported it to compute a real stat.

**Root cause.** Next.js treats every export of a `"use client"` file as a client-reference proxy for RSC serialization — not just component exports, plain constants too.

**How I diagnosed it.** Traced the import chain and recognized the data lived inside a client-directive file purely for convenience, not because it needed to be client-only.

**Fix.** Extracted the constant into a new plain file with no directive (`context/shipCountriesData.ts`), re-exported from the original context file for backward compatibility.

**AI help.** The assistant identified this as a known Next.js framework rule rather than a typo once the symptom was described.

**What I verified manually.** That the affected page reported the correct computed number afterward.

### Native `<dialog>` not reliably wrapping Tab focus

**What happened.** Tabbing past the last focusable element inside a dialog (or Shift+Tab past the first) didn't reliably loop back in one step.

**Root cause.** `showModal()` makes the background inert correctly, but Tab-cycling at the dialog's own boundary isn't fully consistent across engines.

**Fix.** A manual `keydown` handler in `components/Dialog.tsx` intercepts Tab/Shift+Tab at the boundary and redirects focus explicitly.

**What I verified manually.** Actual keyboard-driven Tab cycling through a real dialog, not just reading the `showModal()` documentation and assuming it was covered.

### Turbopack/Lightning CSS silently dropping `backdrop-filter`

**What happened.** A `backdrop-filter: blur(...)` rule in a `.module.css` file produced no visible effect, despite correct syntax and full browser support.

**Root cause.** Next.js 16's Turbopack always uses Lightning CSS for its CSS pipeline (no opt-out), which was stripping the property from the compiled output even in an isolated, minimal test rule.

**Fix.** Applied `backdropFilter`/`WebkitBackdropFilter` via the inline `style` prop instead, bypassing the CSS Module pipeline entirely.

**What I verified manually.** Isolated the property in a minimal rule first to rule out a syntax error before concluding the build tool was responsible; then visually confirmed the frosted-glass effect actually rendered after the fix.

### `react-hooks/set-state-in-effect` flagging inconsistently

**What happened.** This ESLint rule flagged a `setState` call inside one branch of an `if`/`else` in a `useEffect`, but the correct disable-comment placement wasn't obvious and seemed to shift between branches of the *same* effect.

**Root cause.** Not fully explainable from the evidence available — resolved empirically rather than by fully understanding the rule's internals.

**Fix.** Tested different comment placements and kept the one that actually satisfied `npm run lint` with zero errors.

**What I verified manually.** Repeated `npm run lint` runs until the result was actually clean, rather than trusting a placement that "should" have worked.

### Mock test server truncating streamed responses

**What happened.** While testing the AI Assistant locally (no real API key available), a hand-written mock SSE server truncated the second round of a tool-use conversation to one word.

**Root cause.** The mock listened on `req.on("close", ...)` to detect disconnection, but Node's `IncomingMessage` `"close"` event can fire once the request body is fully read — almost immediately for a small JSON POST — not when the response actually closes.

**Fix.** Switched to `res.on("close", ...)` with a `!res.writableEnded` guard.

**What I verified manually.** Reproduced the bug via direct `curl` against the mock server (bypassing my actual route entirely), which proved the bug was in test infrastructure I'd written, not in the shipped code — and re-tested end-to-end afterward to confirm real product data flowed correctly through the fixed pipeline.

### Mobile header wrapping to multiple lines

**What happened.** At 375px width, the header rendered as a tall multi-line stack (~392px, roughly half a phone screen) even after hiding unrelated header elements at that breakpoint.

**Root cause.** The search field's desktop-tuned `flex-basis` (~320px) was wider than the space left after the hamburger button and logo icon, so `flex-wrap` still moved it — and everything after it — to a new line.

**Fix.** Added a mobile-specific `flex-wrap: nowrap` on the header row and changed the search field to `flex: 1 1 auto` (no large fixed basis) at that breakpoint.

**What I verified manually.** Measured the actual rendered header height before (~392px) and after (~65px) at 375×812, and re-confirmed the desktop layout was unaffected at 1280×900.

### Active-thumbnail underline indicator invisible (the multi-hypothesis bug)

**What happened.** A small underline meant to show which category thumbnail is currently active never actually appeared on screen, despite entirely correct CSS.

**How I diagnosed it — the important part.** My first hypothesis was that the thumbnail *row's* `overflow-x: auto` was forcing `overflow-y` to also become non-visible (a real, documented CSS quirk), and I fixed that — and it **did not work**. I then forced `overflow: visible` directly on the row via script, bypassing the stylesheet entirely, and the underline **still didn't appear**, which disproved that entire theory. Only then did I re-inspect the actual thumbnail *button* itself and find `overflow: hidden` there — added originally to clip the thumbnail photo to a rounded square — which was also clipping the button's own `::after` underline, deliberately positioned outside the button's box.

**Root cause.** `.thumbBtn`'s own `overflow: hidden`, not the row's.

**Fix.** Removed `overflow: hidden` from the button and moved photo-clipping to a new, separate inner wrapper (`.thumbImageClip`), leaving the button free to show its underline outside its own bounds.

**What I verified manually.** Cropped, before/after screenshots of the exact pixel region, and reverted my own first (ineffective) fix rather than leaving it in the codebase alongside the real one.

---

## 8. Before vs After Improvements

| Area | Before | After | Why it matters |
|---|---|---|---|
| Checkout | One-time confirmation screen, nothing persisted | Real order saved to `localStorage`, retrievable from Profile (`services/orderService.ts`) | A returning signed-in user can actually see what they ordered |
| Footer links | Five links 404'd | Real `/support`, `/about` pages with computed content | Basic functional correctness |
| Currency selector | Displayed "English, USD" with no effect | Genuinely converts every displayed price (`CurrencyContext`) | The control does what it visually implies |
| Product search | Whole-string substring match; "Lenovo laptop" failed | Token-based match across name/desc/brand | Matches the search placeholder's own promise |
| Brand visibility | `product.brand` only ever emitted into invisible JSON-LD | Visible "Brand: X" line + full sidebar filter | A real, previously-missing piece of information became usable |
| Mobile header | Wrapped to ~392px tall, pushing content off-screen | Single ~65px row + hamburger drawer | Content is visible on first load on a phone |
| Auth page (tablet) | Reused the phone-oriented compact layout up to 1024px | Side-by-side layout from 768px, later refined to a deliberate stacked order on request | Tablets use their actual available width |
| Auth showcase image | 18vh (barely visible) | 400px explicit floor (by direct request), still safely compacted on short viewports | The image is now a real, visible element, not a decorative sliver |
| Thumbnail active-state indicator | Declared correctly in CSS but never actually painted | Genuinely visible, via a separate clipping wrapper | A real (if small) accessibility/affordance fix |
| AI Assistant provider | Would have required a paid Anthropic key | Calls only OpenRouter's free tier, enforced by a runtime guard | Zero-cost by construction, not by convention |

---

## 9. AI Output Evaluation

I did not accept AI-generated code automatically. Four concrete, repository-supported examples:

**1. First fix for the thumbnail-underline bug targeted the wrong element.** The assistant's first proposed fix (row-level `overflow-y`/padding changes) was implemented and tested — and didn't work. I had it prove that via a forced `overflow: visible` script before accepting a different root cause. The ineffective first fix was reverted, not left in the codebase. (Section 7)

**2. The "Explore" button initially linked to the wrong destination.** Based on an early instruction to "move to that product of category," it was implemented to link to one specific product's detail page. I found this didn't match what a button labeled "Explore Automobiles" should reasonably do, and had it corrected to link to the category's real listing page (sorted by trending), removing the now-unused single-product computation rather than leaving dead code behind.

**3. A glassmorphism button's hover state defeated its own visual effect.** The first implementation used a 55%→70% opacity fill on hover, which read as a plain solid button rather than glass, especially over a dark photo. I had the base opacity dropped to 28% (the photo genuinely shows through) and the hover state changed to rely on a lift/shadow instead of a big opacity jump, with a text-shadow added to keep the now-much-more-transparent button's text legible.

**4. Verification scripts themselves gave misleading results.** Several Playwright test scripts used broad selectors like `[class*="panel"]` that, because the AI Assistant panel is mounted globally and reuses common class-name fragments, sometimes matched an unrelated component instead of the one under test. I caught this by cross-checking failing/suspicious results against the raw rendered HTML, and had the selectors narrowed to scope explicitly to the component actually being tested.

I want to be clear that this is not an exhaustive list of every AI mistake — it's the set I can actually point to specific evidence for, rather than a longer list padded out for effect.

---

## 10. Accessibility Engineering

**Strengths, verified directly from code:**
- A real skip-link (`app/layout.tsx`), visually hidden until focused.
- A global, never-removed `:focus-visible` box-shadow ring covering every interactive element type (`app/globals.css`).
- A 44px minimum touch target, applied globally and re-applied consistently in component CSS (thumbnail buttons, dialog close buttons, drawer links).
- `prefers-reduced-motion: reduce` handled once, globally.
- An `.sr-only` utility reused across the app rather than reinvented.
- Real semantic elements — `<article>`/`<a>` product cards, no `<button>` nested inside an `<a>` (a real HTML-validity issue I avoided by keeping `WishlistButton` a sibling of the image link, not a child of it).
- `components/Dialog.tsx`: `aria-labelledby`, `role="dialog"`, `aria-modal="true"`, explicit focus-return on close, and a manually-verified Tab-wrap fix.
- A documented, specific contrast decision: `--color-danger` is explicitly commented as tuned for white text on a badge (not body text), with a separate, darker `--color-danger-text` used anywhere red text sits on a light surface.
- The auth page's auto-advancing carousel pauses entirely (not just resets) on hover or keyboard focus, citing WCAG 2.2.2 directly in its own comment.
- Roving `tabIndex` on the thumbnail carousel; `role="combobox"`/`aria-expanded`/`aria-controls`/`role="listbox"`/`role="option"` on the search-history dropdown.

**Weaknesses I'm disclosing, not hiding:**
- The active-thumbnail underline was, for a period, entirely invisible due to the clipping bug in Section 7 — a real accessibility/affordance defect. **Status: found and fixed.**
- I have not done a manual screen-reader pass (VoiceOver/NVDA/JAWS). All accessibility verification I performed was programmatic (ARIA attribute checks, keyboard simulation, computed-style checks), not a real assistive-technology listen-through. **Status: outstanding.**
- No automated accessibility audit tool (axe-core, Lighthouse accessibility score) has been run against this project. **Status: outstanding.**
- Only one color-token pair has a specific, cited contrast ratio in a comment; I have not independently re-measured the rest of the palette. **Status: not exhaustively verified.**

I am not claiming WCAG 2.1/2.2 AA compliance for the app as a whole — only that the specific techniques listed above are actually implemented and were actually exercised.

---

## 11. Performance Engineering

- **Images:** every product/photo image goes through `next/image`. `ProductCard.tsx` sets explicit `width`/`height` (no layout shift) and `loading="lazy"` except for an opt-in `priority` prop used on the first above-the-fold card. The auth page's full-bleed showcase image uses `fill` with an explicit `sizes="(min-width: 64rem) 50vw, 100vw"` — without this, `next/image` would request a viewport-width-sized image on every device, several times larger than the ~50vw it actually renders at on desktop.
- **Rendering strategy:** `/` and `/product/[id]` use ISR (`revalidate = 3600`) with `generateStaticParams()` pre-building every product page; `/listing` is per-request SSR because its output genuinely depends on the query string.
- **Re-renders:** the AI Assistant's Context is deliberately split into a UI context (open/close, rarely changes) and a chat context (message stream, changes every token), so the navbar trigger button doesn't re-render on every streamed token.
- **Client/server boundary:** `services/productService.ts` has no client-only code, so the same filtering logic runs server-side and client-side without shipping a second copy of the catalog.
- **Dependencies:** deliberately minimal — `next`, `react`, `react-dom`, `lucide-react`, and `react-markdown` are the only runtime dependencies (`package.json`). No AI SDK, no CSS framework, no component library.
- **Search cost:** the navbar's live search suggestions run `filterProducts()` synchronously on every keystroke against the in-memory 59-product catalog — cheap at this size, and I noted in the code itself that this would need debouncing or a different approach if the catalog grew substantially. That's a flagged future consideration, not a current problem.
- **A real warning I diagnosed and fixed:** a `next/image` `fill`-mode image's positioning ancestor was unstyled (`position: static`), which Next.js's dev-time warning flagged because `fill` was resolving against a further ancestor than intended, even though the visual result happened to look identical. Fixed by giving the immediate wrapper `position: relative` explicitly.

I am not claiming a measured LCP number, a Lighthouse score, or a bundle-size reduction — none of those were measured, so none are claimed here.

---

## 12. Security and Environment Variables

- The AI Assistant reads exactly one secret variable, `OPENROUTER_API_KEY`, and one optional non-secret one, `OPENROUTER_MODEL`. Both are read **only** inside `app/api/assistant/route.ts` — `lib/ai.ts`, which that route imports from, never touches `process.env.OPENROUTER_API_KEY` at all. Neither is prefixed `NEXT_PUBLIC_`, so Next.js never bundles either into client-side JavaScript.
- Error responses use fixed, generic strings (e.g., *"The AI assistant isn't configured yet (missing server API key)."*) and never include the actual environment value, an upstream response body, or a stack trace.
- I do not reproduce any secret value anywhere in this document.
- This is an explicitly-labeled frontend prototype — no real backend, no encrypted credential storage, no server session. I'm stating that plainly rather than implying otherwise.

---

## 13. Testing and Verification

`package.json` defines four scripts: `dev`, `build`, `start`, `lint`. **There is no configured automated test runner** (no Jest/Vitest/Playwright as a dependency) — this project has no formal test suite.

**What I actually did to verify changes, repeatedly, per my session record:**
1. `npx tsc --noEmit` — required to pass with zero errors.
2. `npm run lint` — required to pass with zero errors/warnings.
3. `npm run build` — a full production build, confirming every route's rendering strategy resolves and nothing breaks under production-mode checks specifically.
4. Ad hoc Playwright browser-automation scripts run against a local `next dev` server — used as one-time verification for the specific change at hand, not a permanent regression suite.

**Concretely verified this way:** listing-page filter/search/brand combinations including the zero-result fallback; responsive layout at six concrete viewport sizes (375×812, 390×844, 375×667, 768×1024, 1023×768, 1280×900); keyboard interaction (Tab order, Escape, arrow keys) on the mobile drawer, search dropdown, and thumbnail carousel; the AI Assistant's real streaming/cancellation/multi-turn behavior against a hand-written mock server; form validation messaging on the auth pages; absence of horizontal overflow at each tested mobile width; 44px touch-target sizing on new controls.

**Explicitly not verified — recommended, not done:** testing against a real, live OpenRouter key (only a mock server and OpenRouter's real public model-catalog metadata were used); a screen-reader pass; an automated accessibility audit; cross-browser testing outside Chromium; any CI-enforced test suite.

---

## 14. Development Progression Evidence

The development progression I document (Sections 6–8) comes from two real sources: comments in the current code that explicitly describe prior behavior that changed (e.g., `useAuthForm.ts`'s own comment about sign-in no longer auto-registering unseen emails), and my available session record with the assistant.

---

## 15. Lessons Learned

- A framework directive (`"use client"`) can silently corrupt *data*, not just restrict where a component runs — I didn't fully appreciate that until the `SHIP_COUNTRIES` bug forced me to.
- `getComputedStyle` reporting correct values for a CSS rule is not proof it's actually painted — an ancestor's `overflow` can clip something with entirely correct declared styles, and the first plausible ancestor isn't always the right one; I only found the real cause in the thumbnail-underline bug by disproving my first guess with a direct experiment, not by reasoning about it more.
- Build tooling is part of the system I need to debug, not just my own code — the Turbopack/Lightning CSS `backdrop-filter` issue would never have been found by re-reading my CSS syntax over and over.
- Hiding sibling elements at a responsive breakpoint doesn't automatically fix a *remaining* element's own sizing rule that was tuned for a wider context — the mobile header bug taught me to check computed flex-item geometry directly instead of assuming a fix was complete.
- A security-relevant decision is often about deliberately *not* revealing something more convenient to reveal — the generic sign-in error message and the hard no-paid-fallback guard are both examples.
- An ambiguous instruction can be interpreted reasonably and still be wrong — the "Explore" button's destination taught me that the fix, when that happens, is to re-implement based on clarified intent, not to defend my first reading.
- A test script is not automatically trustworthy just because I wrote it — the overly-broad-selector issue showed me that a passing or failing test needs its own sanity check against the real rendered output before I trust its verdict.
- The `localStorage` + `useEffect` hydration pattern is a genuinely reusable solution to a specific, recurring problem (SSR/CSR state mismatch) — recognizing it once made every later instance (cart, wishlist, auth, search history) faster to get right.

---

## 16. What I Would Improve Next

These are realistic, currently-unimplemented improvements — not things I've already done and am restating:

- Initialize Git and start committing with real, incremental messages, so future work has an independently-checkable history (currently none exists).
- Add a small, real automated test suite — the listing-filter logic and the auth-form validation rules are both pure functions and would be straightforward to unit-test, and neither is tested today.
- Run an actual accessibility audit tool (axe-core or Lighthouse) and a manual screen-reader pass, and fix whatever that surfaces — I have not done either yet.
- Exercise the AI Assistant against a real, live OpenRouter key end-to-end before calling that feature production-ready — everything so far has gone through a faithful mock plus OpenRouter's real public model metadata, not a live model response.
- Consider debouncing or indexing the navbar's live search once/if the catalog grows meaningfully past its current 59 products, since the current approach is a synchronous in-memory scan.
- If this ever moves beyond a frontend prototype: a real backend for accounts, orders, and messaging, since all three are currently `localStorage`-only by design.

---

## 17. Final Reflection

Building TradeHub with Claude as an assistant did not mean handing over the project. I used it to move faster on well-specified, conventional work — implementing a new component in an established pattern, drafting an SSE parser against a documented API, applying an accessibility pattern I'd already decided was correct to a new piece of UI. It was genuinely useful for that, and for debugging: proposing a hypothesis and an instrumented way to test it, rather than just a guess.

But every decision that actually mattered stayed mine. I decided which of several reasonable approaches to take, and why — not because the assistant couldn't list options, but because choosing between them required knowing what I actually wanted this project to be (free, not paid; honest about being a prototype; server-rendered where that mattered for crawlability). I caught a first fix that didn't work and pushed for a real investigation instead of accepting a plausible-sounding explanation. I set a hard security/cost constraint and insisted it be enforced in code, not left as a default that could quietly drift. I reviewed generated UI against what I actually wanted it to look and feel like, sometimes across several rounds on the same element, because "compiles and looks roughly right" was never my bar for done.

The clearest evidence of that, to me, is the set of documented corrections in Sections 7 and 9 — cases where a first AI-proposed answer was wrong, or right but not what I meant, and had to be caught, re-investigated, or re-specified before I accepted it. That's what engineering judgment looks like in practice on a project like this: not refusing to use the tool, and not accepting everything it produces either.

---

## 18. Evidence Index

| Claim | Evidence / File | What it demonstrates |
|---|---|---|
| No real backend; auth is a local prototype | `context/AuthContext.tsx`, `hooks/useAuthForm.ts` (own comments) | Honest scoping, not an oversight |
| Sign-in doesn't leak which emails are registered | `hooks/useAuthForm.ts`, generic error message on both failure paths | A real, deliberate security decision |
| No AI SDK dependency added | `package.json` — only `react-markdown` is new | Dependency-minimalism was followed through, not just claimed |
| API key never reaches the client | `lib/ai.ts` (never reads the key) vs. `app/api/assistant/route.ts` (the only file that does), no `NEXT_PUBLIC_` prefix | Server-only secret handling |
| Free-model-only guard is enforced, not just configured | `lib/ai.ts`'s `isFreeModelId()`, called on every request in `route.ts` | A stated constraint became a runtime invariant |
| Catalog size / brand / category counts | `services/productData.ts` (59 products, 9 categories, 43 brands, counted directly) | Concrete, checkable facts, not estimates |
| Token-based search fix | `services/productService.ts`'s `filterProducts()` | A real bug fix, with its own reasoning documented in-code |
| Brand-in-category disabling | `services/productService.ts`'s `getBrandsInCategory`, `components/FilterSidebar.tsx` | A proactive UX decision, not just a filter feature |
| `"use client"` export-proxy bug and fix | `context/shipCountriesData.ts` existing as a plain, non-directive file | A real framework-boundary bug, found and fixed |
| Native `<dialog>` Tab-wrap fix | `components/Dialog.tsx`'s manual `keydown` handler and its own comment | A browser-native element still needed manual verification |
| `backdrop-filter` build-pipeline workaround | Inline `style` props in `components/AuthSplitPage.tsx`, with a comment explaining why | Build-tool-level debugging, not just CSS |
| Mobile header height before/after | `components/Navbar.module.css`'s mobile breakpoint block (`flex-wrap: nowrap`, `flex: 1 1 auto` on the search field) | A responsive bug root-caused past the first, insufficient fix |
| Thumbnail underline clipping bug and fix | `.thumbImageClip` wrapper in the auth page's thumbnail markup/CSS | A multi-hypothesis debugging process, with the wrong first fix reverted |
| No formal automated test suite | `package.json` scripts (`dev`/`build`/`start`/`lint` only) | Honest disclosure of a real gap |
| Accessibility techniques actually implemented | `app/globals.css` (skip-link, focus ring, `.sr-only`, `prefers-reduced-motion`, 44px targets) | Concrete, code-level accessibility work |
| Contrast decision on danger color | `app/globals.css`'s comment on `--color-danger` vs. `--color-danger-text` | A specific, documented WCAG-relevant judgment call |
