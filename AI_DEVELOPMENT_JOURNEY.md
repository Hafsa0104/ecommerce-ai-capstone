# AI Development Journey — TradeHub

**Purpose of this document:** a technical, evidence-based account of how this project was built, with a specific focus on the engineering workflow used at every stage: **UNDERSTAND → ASK AI → INSPECT → EVALUATE → VERIFY → MODIFY/REJECT → TEST → IMPROVE.** This is not a description of what the application does (that exists in the code itself) — it is a record of the decisions, reviews, corrections, and verifications that produced it.

---

## 1. Project Overview

**Purpose.** TradeHub is a wholesale/B2B-oriented e-commerce marketplace, not a generic consumer storefront. Its own metadata states this directly (`app/layout.tsx`): *"TradeHub connects buyers with verified suppliers across automobiles, tech, home, tools, and more — browse, compare, and order in bulk with confidence."* The data model backs this framing up — `types/product.ts` includes quantity `PriceTier`s and a `verified` supplier flag, and the primary purchase action is "Request a Quote," not a simple buy button.

**Technology stack (verified in `package.json`):** Next.js `16.3.3` (App Router, Turbopack), React `19.2.8`, TypeScript `^5` in `strict` mode, `lucide-react` for icons, and `react-markdown` — the single dependency added for the entire AI Assistant feature. No UI/component library, no CSS framework, no state-management library, no AI provider SDK.

**Architecture, briefly.** A static, hand-authored catalog (`services/productData.ts` — 59 products / 9 categories / 43 brands, counted directly from the file) sits behind one pure-function service layer (`services/productService.ts`, no React/DOM dependency) that every feature calls through — the listing page, the AI Assistant's tool call, the navbar's live search, and the auth page's showcase carousel all use the *same* `filterProducts()`. Catalog-heavy pages are Server Components (ISR or per-request SSR); interactive per-visitor state (cart, wishlist, auth, currency, the AI panel) is React Context, composed once in `app/layout.tsx`. Styling is CSS Modules on one shared token file (`app/globals.css`); there is no Tailwind or equivalent.

**Main features (verified from `app/` and `components/`):** category browsing and a server-rendered, URL-driven filter/search/sort/paginate listing; a product detail page with real price tiers, specs, reviews, and a content-based recommendation engine; cart, wishlist, and a real, persisted order history; a mock but genuinely-validated sign-in/sign-up system (both a full page and a contextual modal); product-linked buyer→supplier messaging; a working currency selector; a streaming AI Shopping Assistant tied to the real catalog via tool-calling; and a responsive layout with a dedicated mobile hamburger navigation drawer.

**Important technical decisions (expanded in Section 7):** no backend/database — catalog and orders are local by design, disclosed honestly in the UI; no AI SDK dependency for the AI Assistant, built on raw `fetch()` against a documented HTTP/SSE endpoint instead; a mid-project provider migration from Anthropic directly to OpenRouter's free tier, enforced by a runtime guard rather than a convention; native `<dialog>` for every true modal, deliberately *not* reused for the AI panel.

---

## 2. My Engineering Role

I was responsible for defining what problem was actually being solved, choosing between competing technical approaches, verifying that a proposed or generated solution actually worked in the running application, and deciding when a "working" solution was still wrong.

Concretely, that meant:
- Stating requirements as I actually understood them — often informally (Section 5 gives real, quoted examples) — and re-stating them when a first implementation didn't match what I meant.
- Deciding *which* existing pattern in this codebase should be reused for a new feature (e.g., the `localStorage`+`useEffect` hydration pattern, the native-`<dialog>` modal pattern) versus when an existing pattern didn't fit and a different approach was needed (the AI Assistant panel, Section 7).
- Setting hard constraints that had to be enforced in code, not just followed once — most explicitly, that this project must never call a paid AI API, implemented as a runtime guard checked on every request rather than a default value.
- Running and reading the actual output of `npx tsc --noEmit`, `npm run lint`, and `npm run build` after changes, treating a clean run as a requirement, not a formality.
- Testing behavior directly in the running app — at specific viewport widths, via keyboard interaction, via direct requests against the API route — rather than relying on how the code read.
- Identifying cases where a first fix did not actually work (Section 6) and requiring a second investigation rather than accepting a plausible-sounding explanation.

---

## 3. Development Process

The account below is a **reconstructed development sequence**, not a complete, independently-verified historical timeline. It is assembled from two sources only: comments in the current code that explicitly describe prior behavior that changed, and my available session record of working with the AI assistant. Where I cannot confirm an exact order from either source, I have described the work by category rather than asserted a precise sequence.

With that qualification, the broad progression evidenced by these sources was:

1. **Core commerce loop first** — order placement and persistence (checkout → a retrievable order history), addressing an identified gap where a one-time confirmation screen saved nothing.
2. **Making existing-but-decorative UI functional** — footer links that did not resolve, a currency/language selector that was visually present but had no effect, and product-linked messaging replacing a generic contact form.
3. **A large, explicitly-specified feature** — the AI Shopping Assistant, built from a detailed specification (server-only key handling, real streaming, real cancellation, accessibility and mobile requirements).
4. **A hard constraint change mid-project** — moving the AI Assistant off Anthropic directly and onto OpenRouter's free tier, which required re-adapting the server-side streaming parser, not only swapping a URL.
5. **Iterative UI/UX refinement** — the product-detail icon row, navbar spacing, and the auth pages' showcase panel each went through multiple rounds of targeted feedback on an already-implemented detail (padding, breakpoint, image height, button destination, hover opacity).
6. **Structural, cross-cutting fixes** — brand filtering with category-aware disabling, token-based search matching, and a mobile-navigation rework, each traceable to a specific, identified problem.
7. **Documentation** — this document and two earlier reports (Section 12 notes their existence) were produced from the finished state of the codebase, after the work above was done.

---

## 4. AI-Assisted Development Workflow

AI assistance was used throughout implementation, debugging, and UI iteration, always directed at a problem I had defined and against code the assistant had inspected first. This section categorizes that assistance by what was actually produced and what was actually required of it; Section 5 gives the specific, requirement-by-requirement record, and Section 15 tabulates the resulting division of contribution.

**Implementation work AI produced:** first-draft implementations of new components, hooks, and service functions following conventions already established in the codebase; a hand-written SSE parser and tool-use loop for the AI Assistant, implemented twice — once against Anthropic's message format, once rewritten for OpenRouter's; CSS restructuring for responsive breakpoints; and diagnostic test scripts (Playwright-based) used to check behavior in a running browser.

**Where that work required no correction:** producing convention-following boilerplate once a pattern was already established — the `localStorage` hydration pattern recurring identically across four Context files is the clearest example — and applying an existing convention to a new component without needing it re-explained each time.

**Where that work required correction before acceptance,** each documented with full evidence in Section 6:
- A CSS fix that targeted the wrong element on the first attempt (the thumbnail-underline clipping issue).
- A feature destination that matched a literal instruction but not the intent behind it (the "Explore" button linking to one product instead of a category page).
- A hover state that undermined the visual effect it was meant to preserve (the showcase button's glassmorphism).
- Verification scripts that produced false results because of overly broad element selectors.

**How output was reviewed.** By running the application and exercising the changed feature directly, not by reading the diff alone. Every non-trivial change was followed by `npx tsc --noEmit`, `npm run lint`, and, for larger changes, `npm run build`, plus a targeted manual or scripted check of the specific behavior that had changed.

---

## 5. Prompt & AI Interaction Record

Exact prompts from before my current available session record cannot be verified and are not reconstructed here as historical fact. For the portion of development that is in my available record, the entries below are real, verbatim interactions. Each is broken into the same five fields — **Requirement**, **AI-generated implementation**, **Verification performed**, **Accepted / Modified / Rejected**, **Final implementation** — specifically to keep what I asked for, what the assistant produced, what I actually checked, and what I changed, from blurring into one another.

### Interaction: Order persistence
- **Requirement (verbatim):** *"tell me how user get to know that his order is placed . make proper order"*
- **AI-generated implementation:** A new `services/orderService.ts` (localStorage, scoped per signed-in email) plus wiring into `app/checkout/page.tsx` and `app/profile/page.tsx`.
- **Verification performed:** Confirmed directly in `orderService.ts` that a guest order is deliberately *not* persisted, since there is no account to look it up under later, and confirmed the checkout confirmation screen states this rather than implying otherwise.
- **Accepted / Modified / Rejected:** Accepted as implemented. Not verifiable from available evidence whether any revision preceded this state.
- **Final implementation:** `services/orderService.ts`, read by `app/profile/page.tsx`'s order history and "Orders placed" stat.

### Interaction: Brand filtering with category-aware disabling
- **Requirement (verbatim):** *"IF PARTICULAR CATEGORY HAS PARTICULAR BRAND ITEMS NOT PRESENT then instead of showing products dont match or exist make those brands disable for that category"*
- **AI-generated implementation:** `getBrandsInCategory()` added to `services/productService.ts`; `components/FilterSidebar.tsx` renders non-applicable brands as a disabled `<span>` instead of a `<Link>`.
- **Verification performed:** Inspected `FilterSidebar.tsx` directly to confirm brands were disabled with a stated reason rather than hidden, and that applicable brands (including "All brands") remained real, clickable links.
- **Accepted / Modified / Rejected:** Accepted as implemented.
- **Final implementation:** As described, present in `FilterSidebar.tsx`.

### Interaction: Switching the AI provider under a hard cost constraint
- **Requirement (verbatim, excerpted):** *"IMPORTANT CHANGE OF REQUIREMENT — DO NOT USE ANTHROPIC DIRECTLY ... I DO NOT want to pay for any AI API ... I already use OpenRouter and want this project to use OpenRouter's FREE model access."*
- **AI-generated implementation:** A rewritten `lib/ai.ts` and `app/api/assistant/route.ts` targeting OpenRouter's OpenAI-compatible chat-completions API, defaulting to OpenRouter's own `openrouter/free` router rather than a single pinned free model.
- **Verification performed:** Checked OpenRouter's live public model catalog directly to confirm `openrouter/free` supports `tools`/`tool_choice` (required for the catalog-search feature) at zero price for both prompt and completion tokens, rather than accepting the claim as given.
- **Accepted / Modified / Rejected:** Accepted the router-over-pinned-model choice. **Modified:** required an additional hard runtime guard (`isFreeModelId()`, checked on every request) so the application refuses to proceed rather than silently call a paid model if the configuration is ever wrong — this check was my own requirement added on top of the initial migration, not part of the original proposal.
- **Final implementation:** `lib/ai.ts`'s `isFreeModelId()`/`NON_FREE_MODEL_ERROR`, enforced in `app/api/assistant/route.ts` before any upstream call.

### Interaction: Mobile navigation
- **Requirement (verbatim):** *"in mobile layout the logo look too awkward means at above so nav bar area is tto much that below items are not visible to user i want that make hamburger in mobile"*
- **AI-generated implementation:** `components/MobileNavDrawer.tsx` (native `<dialog>` slide-in) plus a mobile-breakpoint restructuring of `Navbar.module.css`.
- **Verification performed:** Measured rendered header height directly at a 375×812 viewport before and after the change (approximately 392px before, approximately 65px after), and re-confirmed the desktop layout at 1280×900 was unaffected.
- **Accepted / Modified / Rejected:** **Rejected** the first version as incomplete — header elements were hidden but the header still wrapped across multiple lines. Required further investigation rather than accepting a partial fix (root cause in Section 6).
- **Final implementation:** `components/MobileNavDrawer.tsx` + `Navbar.module.css`'s mobile-breakpoint block (`flex-wrap: nowrap`, a mobile-specific `flex: 1 1 auto` on the search field).

### Interaction: The auth showcase image's height
- **Requirement (verbatim, across iterations):** *"the main image height is short increse it"* → (after a first increase) *"no again yet it is not incresed increase it upto 400px"*
- **AI-generated implementation (first attempt):** An increase from roughly 18vh to roughly 30–40vh.
- **Verification performed:** Direct visual comparison against the stated requirement.
- **Accepted / Modified / Rejected:** **Rejected** the vh-based approach as the primary constraint; required a hard `min-height: 400px` floor instead, with `height: 40vh` only permitted to grow it taller on larger viewports.
- **Final implementation:** `components/AuthSplitPage.module.css`'s `.imageFrame` (`height: 400px` on mobile/tablet, with a separate, smaller floor preserved on short viewports specifically so the Sign In button is not pushed off-screen).

### Interaction: The "Explore" button's visual effect
- **Requirement (verbatim, excerpted):** *"firstly add some border radius arounf main image then when i bring mouse over the explore button it all become blue which is not good which hides text change it..."*
- **AI-generated implementation (first attempt):** A 55%-opacity blue fill at rest, rising to 70% on hover.
- **Verification performed:** Direct visual inspection of the hover state against the glassmorphism effect it was intended to preserve.
- **Accepted / Modified / Rejected:** **Rejected** the hover-opacity jump; required the base fill reduced to a level where the underlying photo remains visible, with hover feedback delivered via a lift/shadow instead of a larger opacity change.
- **Final implementation:** `.exploreBtn`/`.exploreBtn:hover` in `AuthSplitPage.module.css` (28% base, 34% hover, plus a `text-shadow` for legibility), confirmed by screenshot comparison before and after.

---

## 6. Problems and Mistakes Discovered

These four cases are the strongest evidence in this document of independent verification catching an incorrect or incomplete result — each is presented in full because the failure, not just the eventual fix, is what demonstrates the review process.

### Token-based search — verified against a negative case, not only the fix

**Problem:** "Lenovo laptop" returned zero results despite a real match, because no single field contained the whole phrase (the brand is "Lenovo," the product name is "Laptops").
**Fix:** `services/productService.ts`'s `filterProducts()` splits the query into tokens and requires each to appear somewhere across name/description/brand.
**Verification that mattered:** Confirming the fix worked for "Lenovo laptop" alone would not distinguish a correct token-based match from an overly permissive one. I additionally tested "Apple laptop," which this catalog's data confirms should still return zero results — the catalog's one Apple-brand product (`tech-2`) is a smart watch, not a laptop. The fix correctly failed this query. Verifying a query that *should* still fail is a materially different and more easily skipped check than confirming queries that should now succeed.

### Mobile header still wrapping after hiding unrelated elements

**Problem:** The header still rendered across multiple lines at 375px even after account links and the category row were hidden — a partial fix, initially indistinguishable from a complete one without measurement.
**Cause:** The search field's desktop-tuned `flex-basis` (~320px) exceeded the space remaining after the hamburger and logo icon, so `flex-wrap` still moved it, and everything after it, to a new line.
**Investigation:** Inspected computed flex-item geometry directly at the mobile breakpoint rather than treating the first change as complete.
**Fix:** `flex-wrap: nowrap` on the header row; `flex: 1 1 auto` (no large fixed basis) on the search field at that breakpoint.
**Result:** Measured header height dropped from approximately 392px to approximately 65px at 375×812; desktop confirmed unaffected at 1280×900.

### Active-thumbnail underline indicator — a disproven first hypothesis

**Problem:** A small underline meant to indicate the active category thumbnail never appeared, despite entirely correct declared CSS.
**First hypothesis:** The thumbnail row's `overflow-x: auto` was forcing `overflow-y` to also clip (a documented CSS interaction). This was implemented as a fix — additional padding, an explicit `overflow-y: visible` — and did not resolve the issue, confirmed by re-screenshotting.
**Disproof:** `overflow: visible` was then forced directly on the row via script, bypassing the stylesheet entirely. The underline still did not appear, which disproved the first hypothesis outright rather than leaving it as an untested assumption.
**Actual cause:** `.thumbBtn`'s own `overflow: hidden` — added to clip the thumbnail photo to a rounded square — was also clipping the button's own `::after` underline, positioned 8px outside the button's box.
**Fix:** `overflow: hidden` removed from `.thumbBtn`; moved to a new, separate inner wrapper (`.thumbImageClip`) around only the `<Image>`.
**Result:** Confirmed via cropped before/after screenshots of the exact pixel region. The disproved first fix was not left in place alongside the real one.

### Mock AI test server truncating streamed responses

**Problem:** During local AI Assistant testing (no live provider key available in that environment), a hand-written mock SSE server cut a second tool-use round off after one word.
**Cause:** The mock listened on `req.on("close", ...)`, but Node's `IncomingMessage` `"close"` event can fire once the request body is fully read — for a small JSON POST, nearly immediately — not when the response itself closes.
**Investigation:** Reproduced directly against the mock server, isolated from the actual route, which confirmed the fault was in test infrastructure rather than the shipped code.
**Fix:** Switched to `res.on("close", ...)` with a `!res.writableEnded` guard.
**Result:** Re-tested end-to-end, confirming real product data flowed correctly through the actual tool-use pipeline afterward.

### Two further issues, documented more briefly

**RSC export-proxy bug.** A plain constant (`SHIP_COUNTRIES`) exported from a file marked `"use client"` produced broken data when a Server Component imported it, because Next.js treats every export of such a file as a client-reference proxy, not only component exports. Extracted into a plain, non-directive file (`context/shipCountriesData.ts`) rather than worked around; verified the affected page reported the correct value afterward.

**Turbopack/Lightning CSS dropping `backdrop-filter`.** A `backdrop-filter` rule had no visible effect despite correct syntax and browser support. Tested in an isolated rule before attributing the cause to the build tool, which confirmed Next.js 16's Lightning CSS pipeline was stripping the property. Applied via the inline `style` prop in `components/AuthSplitPage.tsx` as a targeted bypass; visually confirmed the effect rendering afterward.

---

## 7. Engineering Judgment & Trade-offs

### `localStorage` hydration timing
**Problem:** Cart/wishlist/auth state must persist, but Server Components render where `localStorage` does not exist.
**Alternatives:** A lazy `useState` initializer reading storage directly, versus `useEffect`-based hydration gated by a `hydrated` flag.
**Chosen:** The `useEffect` pattern, applied identically across `CartContext.tsx`, `AuthContext.tsx`, `WishlistContext.tsx`.
**Reasoning:** A lazy initializer would execute during server rendering, mismatching the client's first paint — a correctness issue, not a style preference, requiring an understanding of Next.js's rendering model rather than pattern-matching alone.
**Trade-off:** A brief empty state before hydration, in exchange for correctness; the `hydrated` flag specifically prevents the save effect from overwriting a returning visitor's data before the load effect has run.

### Native `<dialog>` for modals — except the AI Assistant panel
**Problem:** Several features need a real, accessible modal.
**Alternatives:** A hand-rolled modal, a third-party library, or native `<dialog>`.
**Chosen:** Native `<dialog>` for `components/Dialog.tsx`, `MobileFilterDrawer.tsx`, `MobileNavDrawer.tsx` — explicitly not for the AI Assistant panel.
**Reasoning:** A true modal makes the background inert by definition. The AI Assistant panel needs the page to remain scrollable and clickable while open. Recognizing that a pattern already used successfully three times did not fit a fourth, superficially similar case, and implementing `position: fixed` + `inert` toggling instead, required understanding why the existing pattern worked, not only that it did.

### Raw `fetch()` instead of an AI SDK, then a mid-project provider migration
**Problem:** Add streaming AI chat tied to the catalog, without unnecessary dependencies, and — later — without any possibility of API cost.
**Alternatives considered:** the Vercel AI SDK; the provider's own SDK; raw `fetch()` with a hand-written SSE parser. For the provider: Anthropic directly with a paid key; OpenRouter pinned to one specific free model; OpenRouter's own free-model router.
**Chosen:** Raw `fetch()` (`react-markdown` is the only new dependency added to `package.json`); OpenRouter's `openrouter/free` router, with a runtime guard against calling a paid model.
**Reasoning:** Individually pinned free models on OpenRouter are added, repriced, or removed on a rolling basis; pinning one risks the feature breaking later without warning. Translating "never pay, ever" into an enforced check on every request, rather than a one-time configuration choice, required assessing the actual operational risk of configuration drift, not only producing a working demo.

### Disable, don't hide, inapplicable brand filters
**Problem:** A category+brand combination with no overlap produces a guaranteed empty listing page.
**Alternatives:** Leave the combination reachable; hide inapplicable brands; show every brand always, with inapplicable ones disabled and explained.
**Chosen:** The third option.
**Reasoning:** Hiding brands would make the sidebar's list length change unpredictably between categories; a stable list with disabled, explained entries is easier for a shopper to reason about than a list that resizes silently.

---

## 8. Accessibility Review

**Verified strengths, tied to specific files:**
- A real skip-link, hidden until focused (`app/layout.tsx`).
- A global, never-removed `:focus-visible` box-shadow ring across every interactive element type (`app/globals.css`).
- A 44px minimum touch target applied globally and re-applied consistently at the component level.
- `prefers-reduced-motion: reduce` handled once, globally.
- An `.sr-only` visually-hidden utility reused across the app rather than reimplemented per component.
- Semantic, real interactive elements — product cards use `<a>`, with `WishlistButton` kept as a sibling `<button>` rather than a child of the image link, per `ProductCard.tsx`'s own comment explaining why.
- `components/Dialog.tsx`: `aria-labelledby`, `role="dialog"`, `aria-modal="true"`, explicit focus-return on close, and the manually verified Tab-wrap fix from Section 6.
- A specific, documented contrast decision: `--color-danger` is commented as tuned for white text on a badge, not body text, with a separate, darker `--color-danger-text` used wherever red text sits on a light surface.
- The auth page's auto-advancing carousel pauses entirely, not only resets its timer, on hover or keyboard focus, citing WCAG 2.2.2 directly.
- Roving `tabIndex` on the thumbnail carousel; `role="combobox"`/`aria-expanded`/`aria-controls`/`role="listbox"`/`role="option"` on the search-history dropdown.

**Weaknesses, disclosed rather than omitted:**
- The active-thumbnail underline was, for a period, invisible (Section 6) — a real accessibility/affordance defect. **Status: found and fixed.**
- No manual screen-reader pass (VoiceOver/NVDA/JAWS) has been performed; verification was programmatic (ARIA attribute checks, keyboard simulation, computed-style inspection). **Status: outstanding.**
- No automated accessibility audit tool (axe-core, Lighthouse) has been run. **Status: outstanding.**
- Only one color-token pair has an explicitly cited contrast ratio in a comment; the rest of the palette has not been independently re-measured. **Status: not exhaustively verified.**

This document does not claim WCAG 2.1/2.2 AA compliance for the application as a whole — only that the specific techniques above are implemented and were exercised.

---

## 9. Performance & Core Web Vitals

- **Images.** Every photo renders through `next/image`. `ProductCard.tsx` sets explicit `width`/`height` and `loading="lazy"`, except an opt-in `priority` on the first, above-the-fold listing item. The auth page's showcase image uses `fill` with an explicit `sizes="(min-width: 64rem) 50vw, 100vw"` — without it, `next/image` would request a viewport-width-sized image on every device, several times larger than the roughly 50vw it renders at on desktop.
- **Rendering strategy.** `/` and `/product/[id]` use ISR (`revalidate = 3600`) with `generateStaticParams()` pre-building every product page; `/listing` is per-request SSR because its output depends on the query string.
- **Re-render scope.** The AI Assistant's Context is split into a UI context (open/close) and a chat context (message stream), so the navbar trigger does not re-render on every streamed token — a direct response to a stated requirement.
- **Client/server boundary.** `services/productService.ts` has no client-only code, so the same filtering logic runs on server and client without a duplicated catalog shipping separately.
- **Dependency footprint.** `next`, `react`, `react-dom`, `lucide-react`, `react-markdown` — the entire runtime dependency list. No AI SDK, no CSS framework, no component library.
- **A real warning found and fixed.** A `next/image` `fill`-mode image's positioning ancestor was unstyled (`position: static`), triggering Next.js's dev-time warning because `fill` was resolving against a further ancestor than intended. Fixed by giving the immediate wrapper `position: relative` explicitly.
- **An acknowledged, unresolved cost.** The navbar's live search suggestions run `filterProducts()` synchronously on every keystroke — inexpensive at 59 products, but flagged in-code as needing debouncing or indexing if the catalog grows substantially.

No Lighthouse score, LCP measurement, or bundle-size number is claimed anywhere in this document — none were measured.

---

## 10. Security & Environment Variables

- The AI Assistant reads exactly one secret variable, `OPENROUTER_API_KEY`, and one optional non-secret configuration variable, `OPENROUTER_MODEL`, as normal project configuration. Both are read only inside `app/api/assistant/route.ts` — `lib/ai.ts`, imported by that route, never touches `process.env.OPENROUTER_API_KEY`. Neither is prefixed `NEXT_PUBLIC_`, so Next.js never bundles either into client-side JavaScript by construction.
- Error responses from the assistant route use fixed, generic strings and never include the actual environment value, an upstream response body, or a stack trace.
- A related security decision elsewhere in the app: `hooks/useAuthForm.ts` returns the same generic "Invalid email or password" message whether an email is unregistered or the password is wrong, specifically so a failed sign-in attempt cannot be used to enumerate registered emails.
- No secret value is reproduced anywhere in this document.
- This is an explicitly labeled frontend prototype: no real backend, no encrypted credential storage, no server session — stated directly in `AuthContext.tsx`'s own comment and in the auth pages' visible "Prototype" notice.

---

## 11. Code Quality & Architecture Improvements

- **One catalog-access layer, not several.** Making `services/productService.ts` the single point of catalog logic means every subsequent feature (brand filtering, the AI tool call, the navbar's live suggestions, the auth page's trending link) calls the same functions, so a fix made once benefits every consumer.
- **A repeated, recognizable state pattern.** The `localStorage`+`useEffect`+`hydrated`-flag pattern appears identically across Cart, Wishlist, Auth, and search history.
- **URL as the source of truth for listing state.** Filter/sort/search state lives entirely in `/listing`'s URL query string, so results are bookmarkable, shareable, and independent of client-side JavaScript state.
- **Dead code removed, not left behind.** When the "Explore" button's destination changed from a single product to a category listing page, the now-unused per-category "single trending product" computation was removed.
- **Consistent CSS-token discipline.** One shared token file (`app/globals.css`) for color, spacing, radius, and typography, referenced via custom properties everywhere else.
- **Root-cause fixes over patches.** The RSC export-proxy bug, the `backdrop-filter` build-pipeline issue, and the thumbnail-underline clipping bug were each fixed at their verified cause rather than worked around at the symptom.

---

## 12. Documentation Methodology & Evidence Basis

The development progression described in Sections 3, 5, and 6 comes from two sources: comments in the current code that explicitly describe prior behavior that changed, and my available session record of working with the AI assistant. Where neither source supports a specific claim, this document either omits the claim or states explicitly that it is not verifiable — this applies throughout, not only in this section.

Two earlier project reports already exist in this repository as separate artifacts from prior documentation requests: `docs/AI-ASSISTED-DEVELOPMENT-REPORT.md` and `AI_ASSISTED_DEVELOPMENT_REPORT.md`. This document is a distinct, independently produced account rather than a copy of either.

---

## 13. Before vs After

| Area | Initial approach | Problem/limitation | Improved approach | Why it was better |
|---|---|---|---|---|
| Checkout confirmation | One-time screen, nothing saved | A returning user had no record of past orders | `services/orderService.ts`, real `localStorage` order history scoped per signed-in email | Actual, retrievable confirmation instead of a one-time message |
| Currency selector | Displayed "English, USD," no effect | Misleading — looked functional but wasn't | `CurrencyContext`/`currencyData.ts` genuinely converts every displayed price | The control does what it visually implies |
| Product search | Whole-string substring match | "Lenovo laptop" returned zero results despite a real match | Token-based match across name/description/brand, verified against a negative case too | Matches the search placeholder's own stated promise |
| Brand visibility | `product.brand` only ever in invisible JSON-LD | A shopper couldn't see or filter by brand | Visible "Brand: X" line + full sidebar filter, with category-aware disabling | Closes a previously invisible gap |
| Mobile header | Wrapped to ~392px tall before any content was visible | Roughly half a phone screen consumed by chrome | Single ~65px row + `MobileNavDrawer` | Content visible on first load on a phone |
| Auth page (tablet) | Reused the phone-oriented compact layout up to 1024px | Tablets had ~768px+ of unused width | Side-by-side from 768px, later refined to a stacked order per explicit feedback | Layout matches the device's capability and the requested arrangement |
| Auth showcase image | ~18vh | Read as a decorative sliver | 400px explicit floor (smaller, safe floor on short viewports) | A genuinely visible image, without risking the Sign In button falling off-screen |
| "Explore" button destination | Linked to one specific product | Did not match what a category-labeled button implies | Links to the category's own listing page, sorted by trending | Matches the button's label and the trending requirement |
| Explore button hover | Opacity rose toward solid (55%→70%) | Lost the glass effect on the interaction meant to showcase it | Base 28%, hover 34%, feedback via lift/shadow | Glass effect preserved at rest and on hover |
| Thumbnail active indicator | Declared correctly in CSS | Never actually painted (clipped by its own parent) | Photo-clipping moved to a separate wrapper | The indicator genuinely renders |
| AI Assistant provider | Would have required a paid Anthropic key | Conflicted with a hard "never pay" requirement | OpenRouter's free-model router, enforced by a runtime guard | Zero-cost by construction |

---

## 14. What I Learned

- A framework directive (`"use client"`) can affect the data an export resolves to, not only where a component executes — the `SHIP_COUNTRIES` bug made this distinction concrete rather than theoretical.
- `getComputedStyle` reporting correct values for a CSS rule does not confirm that rule is actually rendered — an ancestor's `overflow` can clip an element with entirely correct declared styles, and the first plausible ancestor is not necessarily the real one. Disproving the first hypothesis by direct experiment, rather than re-reading the CSS more carefully, is what located the thumbnail-underline bug's actual cause.
- Build tooling is part of the system under debugging, not only the application code — the Turbopack/Lightning CSS `backdrop-filter` issue was not discoverable by re-reading CSS syntax alone.
- Hiding sibling elements at a responsive breakpoint does not resolve a remaining element's own sizing rule tuned for a different context — the mobile header bug specifically required inspecting computed flex-item geometry directly rather than treating a partial change as complete.
- A security-relevant decision is often about deliberately withholding information that would otherwise be convenient to reveal — the generic sign-in error message and the no-paid-fallback guard are the same discipline applied in two places.
- A literal reading of an ambiguous instruction can be defensible and still not match the intent behind it — the "Explore" button's destination is evidence that the correct response, once that gap is identified, is to re-implement against the clarified intent rather than defend the first interpretation.
- Verification tooling requires its own verification — a test that passes or fails for the wrong reason (an overly broad selector matching an unrelated, globally mounted element) produces false confidence, which is a more difficult failure mode to catch than an obviously broken test.

---

## 15. AI vs Human Contribution

| Area | AI Contribution | My Engineering Contribution | Evidence |
|---|---|---|---|
| Order persistence | First implementation of `orderService.ts` and its wiring | Confirming the guest-order scoping decision was correct, not an oversight | `services/orderService.ts`'s own comment on guest-order scoping |
| AI Assistant architecture | SSE parser, tool-use loop, streaming UI implementation (twice, for two providers) | Deciding no AI SDK dependency was warranted; deciding to migrate providers under a hard cost constraint; adding the runtime free-model guard on top of the initial migration | `package.json` (single new dependency); `lib/ai.ts`'s `isFreeModelId()` |
| Modal pattern | Native `<dialog>` boilerplate across three components | Identifying the AI Assistant panel needed a different pattern, and selecting one | `components/Dialog.tsx` vs. `components/AIAssistantPanel.tsx`'s different approach |
| Search matching | The token-split rewrite once the root cause was identified | Diagnosing the root cause via direct testing; verifying the negative case ("Apple laptop" correctly still returns zero results) | `services/productService.ts`'s `filterProducts()` |
| Brand filtering UX | Implementing the disable/enable branch once specified | Choosing disable-not-hide as the UX approach | `components/FilterSidebar.tsx` |
| Mobile navigation | Drawer component implementation; first CSS restructuring attempt | Measuring header height before/after; identifying the search field's own sizing as the remaining cause after the first attempt | `components/MobileNavDrawer.tsx`; `Navbar.module.css`'s mobile block |
| Auth showcase debugging | Proposing and testing the first (incorrect) thumbnail-underline hypothesis; proposing the disproof test | Requiring re-verification after the first fix, rejecting it once disproved, confirming the actual cause via screenshot evidence | `.thumbImageClip` in `AuthSplitPage.module.css`/`.tsx` |
| Auth showcase destination/visuals | First implementations of the Explore button's link and hover state | Identifying both did not match the intended behavior; specifying corrected values | `AuthSplitPage.module.css`'s `.exploreBtn` and its link `href` |
| Security posture | Implementing server-only key handling and the generic auth error message once specified | Setting the constraints (no enumeration leakage, no possibility of paid usage) those implementations exist to satisfy | `hooks/useAuthForm.ts`; `lib/ai.ts` |
| Testing/verification | Writing Playwright scripts; running `tsc`/`lint`/`build` | Identifying when a test itself was incorrect (overly broad selectors); requiring commands to pass, not only run | Section 6's testing entries |
| Final acceptance | — | Every change in this document was accepted only after being run and checked against the live application | The repeated `tsc`/`lint`/`build` pattern referenced throughout |

---

## 16. Final Reflection

AI accelerated this project most where the work was mechanical once a pattern or target format was established — the repeated `localStorage` hydration pattern, and drafting protocol-heavy code against a documented external API (the SSE parser, implemented twice for two providers).

AI-generated work also introduced risk in three specific, documented cases (Section 6): a CSS fix that targeted the wrong element on the first attempt; a feature destination that satisfied a literal instruction but not its intent; and verification scripts capable of reporting false confidence from an overly broad selector. Each was caught by testing the actual behavior rather than accepting a plausible result, which is the pattern this document has tried to make visible throughout rather than assert separately.

The clearest evidence of engineering understanding in this project is not any single feature; it is the number of cases, tabulated in Section 15, where a first result — AI-produced or my own — was tested, found insufficient, and revised before being accepted: the thumbnail-underline fix that had to be disproven and re-diagnosed, the search fix that was checked against a case it should still fail, and the mobile-header fix that was measured rather than assumed complete once it looked plausible.

One concrete change I would make in a future project: introduce a small, real automated test suite earlier. The listing-filter logic and the auth-form validation rules in this project are both pure functions that would have been straightforward to unit-test from the start, rather than relying entirely on manual and ad hoc scripted verification throughout.
