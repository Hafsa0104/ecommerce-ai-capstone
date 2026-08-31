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

I was responsible for everything an AI assistant cannot be responsible for on its own: **defining what problem was actually being solved, choosing between competing technical approaches, verifying that a proposed or generated solution actually worked in the running application, and deciding when a "working" solution was still wrong.**

Concretely, that meant:
- Stating requirements as I actually understood them (often informally — see Section 5 for real, quoted examples), and re-stating them again when a first implementation didn't match what I meant.
- Deciding *which* existing pattern in this codebase should be reused for a new feature (e.g., the `localStorage`+`useEffect` hydration pattern, the native-`<dialog>` modal pattern) versus when an existing pattern didn't fit and a different approach was needed (the AI Assistant panel, Section 7).
- Setting hard constraints that had to be enforced in code, not just followed once — most explicitly, that this project must never call a paid AI API, which I had implemented as a runtime guard checked on every request, not a default value.
- Running and reading the actual output of `npx tsc --noEmit`, `npm run lint`, and `npm run build` after changes, and treating a clean run as a requirement, not a formality.
- Testing behavior directly in the running app — at real, specific viewport widths, via real keyboard interaction, via direct `curl` requests against the API route — rather than accepting that code "looks correct."
- Catching cases where a first fix didn't actually work (Section 6) and pushing for a real second investigation instead of accepting a plausible-sounding explanation.

---

## 3. Development Process

The project evolved incrementally, feature by feature, rather than as one large upfront design. Based on my available session record and the current state of the code, the rough progression was:

1. **Core commerce loop first** — order placement and persistence (checkout → a real, retrievable order history), since a one-time confirmation with nothing saved was an obvious functional gap.
2. **Making existing-but-decorative UI actually work** — the footer links (five of them 404'd), the currency/language selector (visually present, functionally inert), and product-linked messaging (a generic contact form became a real, product-aware inquiry).
3. **A large, explicitly-specified feature** — the AI Shopping Assistant, built from a long, detailed specification (server-only key handling, real streaming, real cancellation, accessibility and mobile requirements) rather than a vague "add a chatbot" request.
4. **A hard constraint change mid-project** — moving the AI Assistant off Anthropic directly and onto OpenRouter's free tier, specifically to guarantee this project never costs money to run, which required re-adapting the entire server-side streaming parser, not just swapping a URL.
5. **Iterative UI/UX refinement** — the product-detail icon row, navbar spacing, and especially the auth pages' showcase panel all went through multiple rounds of specific, targeted feedback on an already-implemented detail (padding, breakpoint, image height, button destination, hover opacity) rather than being accepted on the first pass.
6. **Structural, cross-cutting fixes** — brand filtering with category-aware disabling, token-based search matching, and a full mobile-navigation rework, each triggered by a real, observed problem rather than a speculative improvement.
7. **Documentation** — this document and two earlier reports (Section 12 notes their existence) were generated from the finished state of the codebase, at my request, after the above work was done.

This is evolutionary, request-driven development — each step responded to a concrete problem or an explicit requirement I gave, not a pre-written roadmap.

---

## 4. AI-Assisted Development

**Where AI was used.** Throughout implementation, debugging, and UI iteration — but always at my direction, on a problem I had defined, against code I had it inspect first.

**What AI helped generate.** First-draft implementations of new components, hooks, and service functions, following conventions already established in the codebase; a hand-written SSE parser and tool-use loop for the AI Assistant (twice — once for Anthropic's format, once rewritten for OpenRouter's); CSS restructuring for responsive breakpoints; and diagnostic test scripts (Playwright-based) used to verify behavior in a running browser.

**What AI was useful for.** Producing working boilerplate quickly once a pattern was established (the `localStorage` hydration pattern recurs identically across four different Context files); applying an existing convention consistently to a new component instead of me having to remember and manually replicate it each time; proposing instrumented diagnostic tests during debugging (direct `curl` requests, `getComputedStyle` checks, forced-style experiments) rather than only guessing at fixes.

**What AI got wrong or produced imperfectly** (detailed with full evidence in Section 6):
- A CSS bug fix that targeted the wrong element entirely on the first attempt (the thumbnail-underline clipping issue).
- A feature destination that technically matched a literal instruction but not the actual intent behind it (the "Explore" button linking to one product instead of a category page).
- A visual effect (glassmorphism) whose hover state undermined the very effect it was supposed to preserve.
- Playwright verification scripts that themselves gave false results because of overly broad element selectors.

**How I reviewed AI output.** By running the application and exercising the actual feature — not by reading the diff and assuming it was correct. Every non-trivial change was followed by `npx tsc --noEmit`, `npm run lint`, and, for larger changes, `npm run build`, plus a targeted manual or scripted check of the specific behavior that had changed.

**How I corrected or improved AI-generated work.** By rejecting a first fix once testing showed it didn't work (Section 6's thumbnail bug), by re-specifying intent when a literal reading produced the wrong UX (the Explore button), and by giving specific, measurable feedback (an exact opacity value, an exact pixel height) rather than accepting "close enough."

**Where I made decisions independently.** Every entry in Section 7 (Engineering Judgment) — which pattern to reuse, which dependency to accept or refuse, how a stated business constraint (never pay for AI usage) should be enforced in code, and when a previously-successful pattern (native `<dialog>`) did not fit a new requirement and needed a different approach instead.

---

## 5. Prompt & AI Interaction Record

Exact prompts from before my current available session record **cannot be verified** and are not reconstructed here as if they were historical fact. For the portion of development that *is* in my available record, the following are real, verbatim interactions, each shown against the actual outcome in the codebase.

### Interaction: Order persistence
- **Goal:** Give a shopper real confirmation that an order was placed, not just a one-time screen.
- **Prompt (verbatim):** *"tell me how user get to know that his order is placed . make proper order"*
- **AI output:** A new `services/orderService.ts` (localStorage, scoped per signed-in email) plus wiring into `app/checkout/page.tsx` and `app/profile/page.tsx`.
- **My evaluation:** Accepted the approach; confirmed the design decision to explicitly *not* persist guest orders (since there's no account to look them up under later) was the right, honest call rather than silently claiming a guest order was saved.
- **What I accepted:** The `localStorage`, email-scoped storage design.
- **What I changed/rejected:** Not verifiable from the available evidence — no documented rejection at this step.
- **Final implementation:** `services/orderService.ts`, read by `app/profile/page.tsx`'s order history and "Orders placed" stat.

### Interaction: Brand filtering with category-aware disabling
- **Goal:** Stop a shopper from combining a category and brand that can never intersect and hitting a dead end.
- **Prompt (verbatim):** *"IF PARTICULAR CATEGORY HAS PARTICULAR BRAND ITEMS NOT PRESENT then instead of showing products dont match or exist make those brands disable for that category"*
- **AI output:** `getBrandsInCategory()` added to `services/productService.ts`; `components/FilterSidebar.tsx` renders non-applicable brands as a disabled `<span>` instead of a `<Link>`.
- **My evaluation:** I confirmed this didn't just hide brands (which would make the list resize unpredictably) but genuinely disabled them with a stated reason, and that "All brands" and applicable brands stayed real, clickable links.
- **What I accepted:** The disable-not-hide approach.
- **Final implementation:** Present exactly as described, verified by inspecting `FilterSidebar.tsx` directly.

### Interaction: Switching the AI provider under a hard cost constraint
- **Goal:** Guarantee the project never requires a paid AI API key.
- **Prompt (verbatim, excerpted):** *"IMPORTANT CHANGE OF REQUIREMENT — DO NOT USE ANTHROPIC DIRECTLY ... I DO NOT want to pay for any AI API ... I already use OpenRouter and want this project to use OpenRouter's FREE model access."*
- **AI output:** A rewritten `lib/ai.ts` and `app/api/assistant/route.ts` targeting OpenRouter's OpenAI-compatible chat-completions API, defaulting to OpenRouter's own `openrouter/free` router rather than a single pinned free model.
- **My evaluation:** I verified this claim myself rather than trusting it — fetching OpenRouter's live public model catalog and confirming `openrouter/free` genuinely supports `tools`/`tool_choice` (required for the catalog-search feature) at $0 price for both prompt and completion tokens, before accepting the approach.
- **What I accepted:** The router-over-pinned-model choice, and the specific reasoning that individual free models get added/repriced/removed on a rolling basis.
- **What I changed/rejected:** I additionally required — and had implemented — a hard runtime guard (`isFreeModelId()`, checked on every request) so the app refuses to proceed rather than silently calling a paid model if the configuration is ever wrong. This was my own addition on top of the initial migration, not something accepted as originally proposed.
- **Final implementation:** `lib/ai.ts`'s `isFreeModelId()`/`NON_FREE_MODEL_ERROR`, enforced in `app/api/assistant/route.ts` before any upstream call.

### Interaction: Mobile navigation
- **Goal:** Fix a mobile header consuming roughly half the screen height before any content was visible.
- **Prompt (verbatim):** *"in mobile layout the logo look too awkward means at above so nav bar area is tto much that below items are not visible to user i want that make hamburger in mobile"*
- **AI output:** `components/MobileNavDrawer.tsx` (native `<dialog>` slide-in) plus a mobile-breakpoint restructuring of `Navbar.module.css`.
- **My evaluation:** I measured the actual rendered header height before and after (not just eyeballed it) — confirmed at approximately 392px before the fix, approximately 65px after, at a 375×812 viewport — and separately re-confirmed desktop layout was unaffected.
- **What I accepted:** The drawer component and the overall approach.
- **What I changed/rejected:** The first version of the fix hid other header elements but the header still wrapped to multiple lines — I had this investigated further rather than accepted as complete once elements were merely hidden (see Section 6 for the root cause).
- **Final implementation:** `components/MobileNavDrawer.tsx` + `Navbar.module.css`'s mobile-breakpoint block (`flex-wrap: nowrap`, a mobile-specific `flex: 1 1 auto` on the search field).

### Interaction: The auth showcase image's height
- **Goal:** Make an under-sized decorative image on the sign-in/sign-up pages visually substantial.
- **Prompt (verbatim, across iterations):** *"the main image height is short increse it"* → (after a first increase) *"no again yet it is not incresed increase it upto 400px"*
- **AI output (first attempt):** An increase from roughly 18vh to roughly 30vh–40vh.
- **My evaluation:** I judged the first increase still insufficient against what I actually wanted and said so directly, with a specific number.
- **What I changed/rejected:** Rejected the vh-based approach as the primary constraint; required a hard `min-height: 400px` floor instead, with `height: 40vh` only allowed to grow it taller on larger viewports.
- **Final implementation:** `components/AuthSplitPage.module.css`'s `.imageFrame` (`height: 400px` on mobile/tablet, with a separate, smaller floor preserved on short viewports specifically so the Sign In button never gets pushed off-screen).

### Interaction: The "Explore" button's visual effect
- **Goal:** A glassmorphism, "3D" action button on the auth showcase image.
- **Prompt (verbatim, excerpted):** *"firstly add some border radius arounf main image then when i bring mouse over the explore button it all become blue which is not good which hides text change it..."*
- **AI output (first attempt):** A 55%-opacity blue fill at rest, rising to 70% on hover.
- **My evaluation:** I identified that the hover state specifically undermined the glass effect it was meant to enhance — described directly in my own words as it "all become blue."
- **What I changed/rejected:** Rejected the large opacity jump on hover; required the base fill dropped substantially (to a level where the underlying photo visibly shows through) and the hover feedback to come from a lift/shadow instead of a bigger opacity change.
- **Final implementation:** `.exploreBtn`/`.exploreBtn:hover` in `AuthSplitPage.module.css` (28% base, 34% hover, plus a `text-shadow` for legibility) — verified by screenshot comparison before and after.

---

## 6. Problems and Mistakes Discovered

### RSC boundary bug — a `"use client"` export resolving incorrectly on the server

**Problem:** A plain constant (`SHIP_COUNTRIES`) exported from a file marked `"use client"` produced broken/empty data when a Server Component (`app/about/page.tsx`) imported it.
**Cause:** Next.js treats *every* export of a `"use client"` file as a client-reference proxy for RSC serialization, not only component exports.
**Investigation:** Traced the import chain and recognized the data lived in a client-directive file only for convenience, not necessity.
**Decision:** Extract the data into its own plain (non-directive) file rather than work around the symptom.
**Fix:** `context/shipCountriesData.ts` created; `context/ShipCountryContext.tsx` re-exports it.
**Result:** Verified the affected page reported the correct value afterward.

### Native `<dialog>` not reliably wrapping Tab focus

**Problem:** Tabbing past a dialog's last focusable element didn't reliably loop back in one step.
**Cause:** `showModal()` correctly makes the background inert, but boundary Tab-cycling isn't consistent across engines.
**Investigation:** Manual keyboard testing — not discoverable from reading the markup.
**Decision:** Add an explicit `keydown` handler rather than trust the platform fully.
**Fix:** `components/Dialog.tsx`'s `handleKeyDown` redirects focus at the boundary.
**Result:** Verified via actual keyboard-driven Tab cycling.

### Turbopack/Lightning CSS silently dropping `backdrop-filter`

**Problem:** A `backdrop-filter` rule had zero visible effect despite correct syntax and full browser support.
**Cause:** Next.js 16's Turbopack always uses Lightning CSS, which was stripping the property from compiled output even in an isolated test rule.
**Investigation:** Tested the property in a minimal, unrelated rule to rule out a syntax/override problem before blaming the build tool.
**Decision:** Bypass the CSS Module pipeline for just this property.
**Fix:** Applied `backdropFilter`/`WebkitBackdropFilter` via the inline `style` prop in `components/AuthSplitPage.tsx`.
**Result:** Visually confirmed the frosted-glass effect rendering correctly.

### `react-hooks/set-state-in-effect` flagging inconsistently

**Problem:** The rule flagged a `setState` call in one branch of an `if`/`else` inside a `useEffect`, and the correct disable-comment placement wasn't obvious or predictable.
**Cause:** Not fully explainable from available evidence.
**Investigation:** Resolved empirically — testing different placements against real `npm run lint` output.
**Decision:** Trust the tool's actual output over an assumption about how it "should" behave.
**Fix:** The lint-clean placement, documented with the legitimate external-store-sync justification.
**Result:** `npm run lint` reporting zero errors.

### Mock AI test server truncating streamed responses

**Problem:** During local AI Assistant testing (no live provider key available), a hand-written mock SSE server cut a second tool-use round off after one word.
**Cause:** The mock listened on `req.on("close", ...)`, but Node's `IncomingMessage` `"close"` can fire once the request body is fully read — nearly immediately for a small JSON POST — not when the response actually closes.
**Investigation:** Reproduced via direct `curl` against the mock server, bypassing my real route entirely, which proved the bug lived in test infrastructure, not the shipped code.
**Decision:** Fix the mock, not the route.
**Fix:** Switched to `res.on("close", ...)` with a `!res.writableEnded` guard.
**Result:** Re-tested end-to-end via `curl`, confirming real product data flowed correctly through the actual tool-use pipeline afterward.

### Mobile header still wrapping after hiding unrelated elements

**Problem:** The header still rendered across multiple lines at 375px even after account links and the category row were hidden.
**Cause:** The search field's desktop-tuned `flex-basis` (~320px) was wider than the remaining space after the hamburger and logo icon, so `flex-wrap` still moved it (and everything after it) to a new line.
**Investigation:** Inspected computed flex-item geometry directly at the mobile breakpoint rather than assuming the fix was already complete.
**Decision:** The search field's own sizing rule needed a mobile-specific override, not just its siblings' visibility.
**Fix:** `flex-wrap: nowrap` on the header row, `flex: 1 1 auto` (no large fixed basis) on the search field at that breakpoint.
**Result:** Measured header height dropped from ~392px to ~65px at 375×812; desktop confirmed unaffected at 1280×900.

### Active-thumbnail underline indicator invisible — a multi-step misdiagnosis

**Problem:** A small underline meant to show the currently-active category thumbnail never appeared, despite entirely correct declared CSS.
**Cause (final):** `.thumbBtn`'s own `overflow: hidden` — added to clip the thumbnail photo to a rounded square — was also clipping the button's own `::after` underline, deliberately positioned 8px outside the button's box.
**Investigation:** My first hypothesis (the thumbnail *row's* `overflow-x: auto` forcing `overflow-y` to also clip, a real documented CSS quirk) was implemented as a fix — extra padding, explicit `overflow-y: visible` — and **did not work**, confirmed by re-screenshotting. I then forced `overflow: visible` directly on the row via script, bypassing the stylesheet entirely, and the underline **still didn't appear**, disproving that theory outright. Only then did re-inspecting the *button's own* rule find the real cause.
**Decision:** Reject the first (ineffective) fix rather than leave it alongside the real one; move the photo's clipping to a new, separate inner wrapper instead of removing clipping altogether.
**Fix:** `overflow: hidden` removed from `.thumbBtn`, added to a new `.thumbImageClip` wrapper around just the `<Image>`.
**Result:** Confirmed via cropped, before/after screenshots of the exact pixel region.

---

## 7. Engineering Judgment & Trade-offs

### `localStorage` hydration timing
**Problem:** Cart/wishlist/auth state must persist, but Server Components render where `localStorage` doesn't exist.
**Alternatives:** A lazy `useState` initializer reading storage directly, versus a `useEffect`-based hydration with a `hydrated` flag gating the save effect.
**Chosen:** The `useEffect` pattern, identically across `CartContext.tsx`, `AuthContext.tsx`, `WishlistContext.tsx`.
**Why accepting AI output blindly would have been weaker:** A lazy initializer would run during server rendering, throwing or silently mismatching against the client's first paint — this is a genuine correctness bug, not a style preference, and required understanding *why* Next.js's rendering model makes it one.
**Trade-off:** A brief "empty" flash before hydration, in exchange for correctness; the `hydrated` flag specifically prevents the save-effect from wiping a returning visitor's cart before the load-effect has run.

### Native `<dialog>` for modals — except the AI Assistant panel
**Problem:** Several features need a real, accessible modal.
**Alternatives:** Hand-rolled modal, a third-party library, or native `<dialog>`.
**Chosen:** Native `<dialog>` for `components/Dialog.tsx`, `MobileFilterDrawer.tsx`, `MobileNavDrawer.tsx` — but **explicitly not** for the AI Assistant panel.
**Why this required judgment, not just pattern-matching:** A true modal makes the background inert by definition. The AI Assistant panel needs the opposite — the page must stay scrollable and clickable while it's open. Recognizing that a pattern that had already worked three times elsewhere did not fit a fourth, superficially-similar case, and choosing a different implementation (`position: fixed` + `inert` toggling) instead of forcing the existing one to fit, is exactly the kind of decision that separates applying a pattern from understanding why it exists.

### Raw `fetch()` instead of an AI SDK, then a mid-project provider migration
**Problem:** Add real streaming AI chat tied to the catalog, without unnecessary dependencies, and — later — without any possibility of API cost.
**Alternatives:** The Vercel AI SDK; the provider's own SDK; raw `fetch()` with a hand-written SSE parser. For the provider: Anthropic directly with a paid key; OpenRouter pinned to one specific free model; OpenRouter's own free-model router.
**Chosen:** Raw `fetch()` (confirmed: `react-markdown` is the only new dependency in `package.json`); OpenRouter's `openrouter/free` router, with a hard runtime guard against ever calling a paid model.
**Why this mattered:** Individually-pinned free models on OpenRouter are known to be added, repriced, or removed on a rolling basis — pinning one risks the feature silently breaking later. Choosing the router over a pinned model, and then translating "never pay, ever" into an enforced code check on every request rather than a one-time configuration choice, are both decisions that required understanding the actual operational risk, not just getting a working demo.

### Token-based product search
**Problem:** "Lenovo laptop" returned zero results even though a matching product existed, because no single field ("Lenovo" the brand, "Laptops" the name) contained the whole phrase.
**Alternatives:** Keep the whole-string substring check; split the query into words and require each word to appear anywhere across name/description/brand.
**Chosen:** Token-based matching in `services/productService.ts`'s `filterProducts()`.
**Verification that mattered:** I specifically tested the negative case too — confirming that "Apple laptop" *correctly* still returns zero results after the fix, because this catalog's one Apple product is a smartwatch, not a laptop. Verifying a query that should still fail is a different and easy-to-skip check compared to only confirming the queries that should now succeed.

### Disable, don't hide, inapplicable brand filters
**Problem:** A category+brand combination with no overlap produces a guaranteed empty listing page.
**Alternatives:** Do nothing (let the shopper hit the dead end); hide inapplicable brands; show every brand always but disable the inapplicable ones with an explanation.
**Chosen:** The third option.
**Why:** Hiding brands would make the sidebar's list length change unpredictably as the category changes — a stable list with disabled, explained entries is easier for a shopper to reason about than a list that silently resizes.

---

## 8. Accessibility Review

**Verified strengths, tied to specific files:**
- A real skip-link, hidden until focused (`app/layout.tsx`).
- A global, never-removed `:focus-visible` box-shadow ring across every interactive element type (`app/globals.css`), with the file's own comment stating the rule directly.
- A 44px minimum touch target applied globally and re-applied consistently at the component level (thumbnail buttons, dialog close buttons, drawer links).
- `prefers-reduced-motion: reduce` handled once, globally, forcing near-zero animation/transition durations.
- An `.sr-only` visually-hidden utility reused across the app rather than reimplemented per component.
- Semantic, real interactive elements — `<article>`/`<a>` product cards, and a deliberately-avoided invalid nesting (`WishlistButton`, a `<button>`, kept as a sibling of the image `<Link>`, not a child of it, per `ProductCard.tsx`'s own comment explaining why).
- `components/Dialog.tsx`: `aria-labelledby`, `role="dialog"`, `aria-modal="true"`, explicit focus-return on close, and the manually-verified Tab-wrap fix from Section 6.
- A specific, documented contrast decision: `--color-danger` is commented as tuned for white text on a badge, not body text, with a separate darker `--color-danger-text` used wherever red text sits on a light surface.
- The auth page's auto-advancing carousel pauses entirely (not just resets its timer) on hover or keyboard focus, citing WCAG 2.2.2 directly in its own comment.
- Roving `tabIndex` on the thumbnail carousel; `role="combobox"`/`aria-expanded`/`aria-controls`/`role="listbox"`/`role="option"` on the search-history dropdown.

**Weaknesses, disclosed rather than hidden:**
- The active-thumbnail underline was, for a period, completely invisible (Section 6) — a real accessibility/affordance defect. **Status: found and fixed.**
- No manual screen-reader pass (VoiceOver/NVDA/JAWS) has been performed — all verification was programmatic (ARIA attribute checks, keyboard simulation, computed-style inspection). **Status: outstanding.**
- No automated accessibility audit tool (axe-core, Lighthouse) has been run. **Status: outstanding.**
- Only one color-token pair has an explicitly cited contrast ratio in a comment; the rest of the palette hasn't been independently re-measured. **Status: not exhaustively verified.**

I am not claiming WCAG 2.1/2.2 AA compliance for the app as a whole — only that the specific techniques above are implemented and were exercised.

---

## 9. Performance & Core Web Vitals

- **Images:** every photo renders through `next/image`. `ProductCard.tsx` sets explicit `width`/`height` (avoiding layout shift/CLS) and `loading="lazy"` except for an opt-in `priority` card (the first, above-the-fold item — `app/listing/page.tsx`'s `priority={i === 0}`). The auth page's full-bleed showcase image uses `fill` with an explicit `sizes="(min-width: 64rem) 50vw, 100vw"` — without it, `next/image` would request a viewport-width-sized image on every device, several times larger than the ~50vw it actually renders at on desktop; this is a specific, code-verified optimization, not a general claim.
- **Rendering strategy:** `/` and `/product/[id]` use ISR (`revalidate = 3600`) with `generateStaticParams()` pre-building every product page ahead of request time; `/listing` is per-request SSR because its output genuinely depends on the query string. This means the primary, catalog-driven pages have pre-formed HTML on first load rather than an empty client-rendered shell.
- **Unnecessary re-renders:** the AI Assistant's Context is deliberately split into a UI context (open/close, rarely changes) and a chat context (message stream, changes every token), so the navbar trigger button doesn't re-render on every streamed token — a concrete, code-verified architectural response to a stated performance requirement, not a default pattern applied without reason.
- **Client/server boundary:** `services/productService.ts` has no client-only code, so the same filtering logic runs identically server-side and client-side without a duplicated copy of the catalog shipping to the browser separately.
- **Dependency footprint:** `next`, `react`, `react-dom`, `lucide-react`, `react-markdown` — the entire runtime dependency list (`package.json`). No AI SDK, no CSS framework, no component library.
- **Animations:** motion throughout (thumbnail hover underline, showcase image fade, dialog entrance) uses `transform`/`opacity`-only transitions — a reasonable engineering interpretation based on the properties actually used, not a claim backed by a measured frame-rate profile.
- **A real warning found and fixed:** a `next/image` `fill`-mode image's positioning ancestor was unstyled (`position: static`), triggering Next.js's dev-time warning because `fill` was resolving its absolute positioning against a further ancestor than intended. Fixed by giving the immediate wrapper `position: relative` explicitly.
- **An acknowledged, not-yet-a-problem cost:** the navbar's live search suggestions run `filterProducts()` synchronously on every keystroke against the in-memory catalog — inexpensive at 59 products (the code's own comment states this reasoning directly), but flagged as needing debouncing or indexing if the catalog grows substantially.

No Lighthouse score, LCP measurement, or bundle-size number is claimed anywhere in this document — none were measured.

---

## 10. Security & Environment Variables

- The AI Assistant reads exactly one secret variable, `OPENROUTER_API_KEY`, and one optional non-secret configuration variable, `OPENROUTER_MODEL`, as normal project configuration. Both are read **only** inside `app/api/assistant/route.ts` — `lib/ai.ts`, imported by that route, never touches `process.env.OPENROUTER_API_KEY` at all. Neither is prefixed `NEXT_PUBLIC_`, so Next.js never bundles either into client-side JavaScript by construction.
- Error responses from the assistant route use fixed, generic strings (e.g., a missing-key message) and never include the actual environment value, an upstream response body, or a stack trace.
- A related, deliberate security decision elsewhere in the app: `hooks/useAuthForm.ts` returns the *same* generic "Invalid email or password" message whether an email isn't registered or the password is wrong, specifically so a failed sign-in attempt can't be used to enumerate which emails have accounts.
- No secret value is reproduced anywhere in this document — only variable names, and only where relevant to explaining how they're handled.
- This is an explicitly-labeled frontend prototype: no real backend, no encrypted credential storage, no server session — stated directly in `AuthContext.tsx`'s own comment and in the auth pages' visible "Prototype" notice.

---

## 11. Code Quality & Architecture Improvements

- **One catalog-access layer, not several.** Before I made `services/productService.ts` the single point of catalog logic, features risked reimplementing filtering/search independently; every subsequent feature (brand filtering, the AI tool call, the navbar's live suggestions, the auth page's trending link) instead calls the same functions, so a fix or improvement made once (like the token-based search rewrite) benefits every consumer automatically.
- **A repeated, recognizable state pattern.** The `localStorage`+`useEffect`+`hydrated`-flag pattern appears identically across Cart, Wishlist, Auth, and search history — recognizing and reusing this pattern rather than inventing a new persistence approach per feature is a direct maintainability improvement I made a deliberate point of applying consistently.
- **URL as the source of truth for listing state.** Filter/sort/search state lives entirely in `/listing`'s URL query string rather than component state, which I chose specifically so results are bookmarkable, shareable, and independent of any client-side JavaScript bug.
- **Dead code removed, not left behind.** When the "Explore" button's destination changed from a single product to a category listing page, the now-unused per-category "single trending product" computation was removed rather than left as an unused, confusing leftover.
- **Consistent CSS-token discipline.** One shared token file (`app/globals.css`) for color, spacing, radius, and typography, referenced via CSS custom properties everywhere else — no component invents its own one-off color or spacing value outside that system, per direct inspection of the `.module.css` files touched during this work.
- **Root-cause fixes over patches.** The RSC export-proxy bug, the `backdrop-filter` build-pipeline issue, and the thumbnail-underline clipping bug were each fixed at their actual, verified cause rather than worked around at the symptom.

---

## 12. Documentation Methodology & Evidence Basis

The development progression described in Sections 3, 5, and 6 comes from two real sources: comments in the current code that explicitly describe prior behavior that changed (for example, `hooks/useAuthForm.ts`'s own comment stating that sign-in used to silently auto-register unseen emails and no longer does), and my available session record of working with the AI assistant.

Two earlier project reports already exist in this repository as separate artifacts from prior documentation requests: `docs/AI-ASSISTED-DEVELOPMENT-REPORT.md` and `AI_ASSISTED_DEVELOPMENT_REPORT.md`. This document is a distinct, independently-produced account rather than a copy of either.

---

## 13. Before vs After

| Area | Initial approach | Problem/limitation | Improved approach | Why it was better |
|---|---|---|---|---|
| Checkout confirmation | One-time screen, nothing saved | A returning user had no record of past orders | `services/orderService.ts`, real `localStorage` order history scoped per signed-in email | Actual, retrievable confirmation instead of a one-time message |
| Currency selector | Displayed "English, USD," no effect | Misleading — looked functional but wasn't | `CurrencyContext`/`currencyData.ts` genuinely converts every displayed price | The control does what it visually implies |
| Product search | Whole-string substring match | "Lenovo laptop" returned zero results despite a real match | Token-based match across name/description/brand | Matches the search placeholder's own stated promise |
| Brand visibility | `product.brand` only ever in invisible JSON-LD | A shopper couldn't see or filter by brand | Visible "Brand: X" line + full sidebar filter, with category-aware disabling | Closes a real, previously-invisible gap |
| Mobile header | Wrapped to ~392px tall before any content was visible | Roughly half a phone screen consumed by chrome | Single ~65px row + `MobileNavDrawer` | Content visible on first load on a phone |
| Auth page (tablet) | Reused the phone-oriented compact layout up to 1024px | Tablets had ~768px+ of unused width | Side-by-side from 768px, later refined to a deliberate stacked order per explicit feedback | Layout matches the device's actual capability and the requested arrangement |
| Auth showcase image | ~18vh (barely visible) | Read as a decorative sliver, not a real element | 400px explicit floor (with a smaller, safe floor on short viewports) | A real, visible image, without risking the Sign In button falling off-screen on short phones |
| "Explore" button destination | Linked to one specific product | Didn't match what a category-labeled button implies | Links to the category's own listing page, sorted by trending | Matches the button's own label and the "trending" requirement, applied to the right target |
| Explore button hover | Opacity rose toward solid (55%→70%) | Lost the glass effect on the exact interaction meant to showcase it | Base dropped to 28%, hover to 34%, feedback via lift/shadow instead | Glass effect preserved at rest and on hover; legibility protected via text-shadow instead of opacity |
| Thumbnail active indicator | Declared correctly in CSS | Never actually painted (clipped by its own parent) | Photo-clipping moved to a separate wrapper | The indicator now genuinely renders |
| AI Assistant provider | Would have required a paid Anthropic key | Conflicted with a hard "never pay" requirement | OpenRouter's free-model router, enforced by a runtime guard | Zero-cost by construction, not by convention or trust |

---

## 14. What I Learned

- A framework directive (`"use client"`) can silently corrupt *data*, not just restrict where a component executes — I hadn't fully internalized that distinction until the `SHIP_COUNTRIES` bug forced me to.
- `getComputedStyle` reporting entirely correct values for a CSS rule is not proof that rule is actually painted on screen — an ancestor's `overflow` can clip something with perfectly correct declared styles, and the first plausible-looking ancestor isn't necessarily the real one; disproving my own first hypothesis by direct experiment, not by re-reading the CSS more carefully, is what actually found the thumbnail-underline bug's real cause.
- Build tooling is part of the system I have to debug, not just the code I write — the Turbopack/Lightning CSS `backdrop-filter` issue would never have surfaced from re-reading CSS syntax alone.
- Hiding sibling elements at a responsive breakpoint does not automatically fix a *remaining* element's own sizing rule tuned for a different, wider context — the mobile header bug specifically taught me to inspect computed flex-item geometry directly rather than assume a partial fix was complete.
- A security-relevant decision is often about deliberately withholding information that would otherwise be convenient to reveal — the generic sign-in error message and the hard no-paid-fallback guard are both examples of this same discipline applied in different places.
- A literal reading of an ambiguous instruction can be reasonable and still not match what was actually meant — the "Explore" button's destination is direct evidence that the correct response, once that's discovered, is to re-implement based on the clarified intent, not defend the first interpretation.
- Verification tooling needs its own verification — a Playwright script that passes or fails for the wrong reason (an overly broad selector matching an unrelated, globally-mounted element) creates false confidence, which is worse than having no automated check at all.

---

## 15. AI vs Human Contribution

| Area | AI Contribution | My Engineering Contribution | Evidence |
|---|---|---|---|
| Order persistence | First implementation of `orderService.ts` and its wiring | Confirming the guest-order honesty decision was the right call, not an oversight | `services/orderService.ts`'s own comment on guest-order scoping |
| AI Assistant architecture | SSE parser, tool-use loop, streaming UI implementation (twice, for two providers) | Deciding no AI SDK dependency was acceptable; deciding to migrate providers under a hard cost constraint; adding the runtime free-model guard on top of the initial migration | `package.json` (single new dependency); `lib/ai.ts`'s `isFreeModelId()` |
| Modal pattern | Implementing native `<dialog>` boilerplate across three components | Recognizing the AI Assistant panel needed a *different* pattern and choosing one | `components/Dialog.tsx` vs. `components/AIAssistantPanel.tsx`'s different approach |
| Search matching | Proposing the token-split rewrite once the root cause was identified | Diagnosing the root cause via direct testing; verifying the fix's negative case ("Apple laptop" correctly still returns zero) | `services/productService.ts`'s `filterProducts()` and its comment |
| Brand filtering UX | Implementing the disable/enable branch once specified | Choosing disable-not-hide as the UX approach | `components/FilterSidebar.tsx` |
| Mobile navigation | Drawer component implementation; first CSS restructuring attempt | Measuring actual header height before/after; identifying the search field's own sizing as the remaining cause after the first attempt | `components/MobileNavDrawer.tsx`; `Navbar.module.css`'s mobile block |
| Auth showcase debugging | Proposing and testing the first (incorrect) thumbnail-underline hypothesis; proposing the disproof test | Insisting on re-verification after the first fix, rejecting it once disproved, and confirming the real cause via screenshot evidence | `.thumbImageClip` in `AuthSplitPage.module.css`/`.tsx` |
| Auth showcase destination/visuals | First implementations of the Explore button's link and hover state | Identifying both didn't match actual intent, specifying corrected values | `AuthSplitPage.module.css`'s `.exploreBtn` and its link `href` |
| Security posture | Implementing server-only key handling and the generic auth error message once specified | Setting the actual constraints (never leak enumeration info, never risk paid usage) those implementations exist to satisfy | `hooks/useAuthForm.ts`; `lib/ai.ts` |
| Testing/verification | Writing Playwright scripts and running `tsc`/`lint`/`build` | Catching when a test itself was wrong (overly broad selectors) and requiring commands to actually pass, not just run | Section 6's testing entries |
| Final acceptance | — | Every change in this document was only accepted after being run and checked against the live application, not on the strength of the diff alone | Repeated `tsc`/`lint`/`build` pattern referenced throughout |

---

## 16. Critical Reflection

**Where AI accelerated development.** Producing correct, convention-following boilerplate quickly once a pattern was already established (the four-file `localStorage` hydration pattern is the clearest example) and drafting protocol-heavy code against a documented external API (the SSE parser, twice) — work that is well-specified and mechanical once the target format is known, but tedious and error-prone to write from scratch each time.

**Where AI introduced risk.** Three concrete, documented cases: a debugging fix that targeted the wrong CSS element on the first attempt and would have shipped as "done" if I hadn't re-screenshotted after applying it; a feature destination that technically satisfied a literal instruction but not its actual intent, which would have shipped as a real UX mismatch if I hadn't reviewed the behavior against what a labeled button should reasonably do; and verification scripts that could report false confidence from an overly broad selector, which is arguably a more dangerous failure mode than an obviously-broken test, because it looks like coverage that isn't real.

**Where human judgment was essential.** Every case in this document where a stated constraint (never pay for AI usage, never leak account-enumeration information, keep the background interactive behind a non-modal panel) had to be translated into an actual, enforced code decision rather than accepted as a one-time instruction that could quietly drift later. None of those translations happen automatically — they require understanding *why* the constraint exists, not just what it literally says.

**What I would do differently in a future project.** Introduce even a small, real automated test suite earlier — the listing-filter logic and the auth-form validation rules are both pure functions that would have been simple to unit-test from the start, rather than relying entirely on manual and ad hoc scripted verification throughout.

---

## 17. Final Engineering Summary

The strongest evidence in this repository that I understand the code — rather than having simply accepted what an assistant produced — is not any single feature. It's the pattern visible across Sections 5 and 6: **more than one case where a first AI-produced answer was tested, found wrong or insufficient, and had to be re-investigated or re-specified before I accepted it.** A developer who didn't understand the code well enough to predict what a fix *should* do would not have been positioned to notice that the thumbnail-underline fix hadn't worked, would not have known to test the negative case on the search-matching fix, and would not have recognized that a technically-correct implementation of "move to that product of category" didn't match what a button labeled "Explore Automobiles" should actually do.

Equally, the decisions that required no AI disagreement at all — choosing `useEffect`-based hydration over a lazy initializer, choosing not to reuse the modal pattern for the AI panel, choosing to enforce a cost constraint as a runtime check rather than a comment — are decisions I made because I understood *why* one option was structurally correct and the other wasn't, not because either option was presented to me as obviously right.

AI was a genuinely useful assistant on this project: fast at producing convention-following first drafts, useful at proposing diagnostic tests during debugging, and capable of adapting an entire streaming integration to a new provider once directed to. It was not the engineer. The engineering — defining the actual problem, choosing between real trade-offs, verifying behavior in the running application, and rejecting or correcting output that didn't hold up — was mine, and this document is built entirely from evidence that supports that claim rather than from a description of what the finished application does.
