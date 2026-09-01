# Implementation note

**Status: MVP complete · 14 Aug 2025**

Implemented a polished mock-first hotel operations workspace in `src/app/page.tsx` and `src/app/globals.css`:

- Dashboard with occupancy donut, room-type availability, arrivals, booking ledger and invoice pulse.
- Navigable bookings, guests, travel-agent rate desk and invoice register views.
- New booking modal with tourist/local meal behavior, rate profile fallback, staff defaults, editable-recipient explanation and saved-rate-snapshot confirmation.
- Invoice register with Nu. totals, service charge/GST context and print actions.
- Responsive mobile layout, keyboard focus states, print stylesheet and reduced-motion support.
- Domain types in `src/lib/types.ts`, realistic seed data in `src/lib/mock-data.ts`, `.env.example`, and a Supabase-ready admin-only schema in `supabase/schema.sql`.

The app is intentionally mock-first when Supabase environment variables are missing. Next integration should replace the seed-data reads with Supabase queries while retaining the same typed models and rate snapshot semantics.

## Validation

- `npm install --no-audit --no-fund` completed after an initial network timeout; `npm ls --depth=0` confirms every declared dependency is installed and `package-lock.json` is retained.
- `npm run lint` ✅
- `npx tsc --noEmit` ✅
- Native `next build` and `next build --webpack` hit a host-level `SIGBUS` while loading Next native SWC under Node 26 (confirmed with gdb in the dynamic-library loader), before application compilation.
- The build script intentionally uses Next’s WASM SWC fallback and webpack: `npm run build` (`NEXT_TEST_WASM=1 next build --webpack`) ✅. Production compilation, type checking, static generation, and route optimization completed successfully.

## Multi-pane review loop

Reviewers ran in Herdr sibling panes from the project directory. The first `codex` launch attempt could not authenticate, so it was stopped and replaced with four functioning `pi` reviewers:

- `domain-reviewer` · `w1:p3` — product/domain correctness
- `ui-reviewer` · `w1:p4` — UI and accessibility
- `security-reviewer` · `w1:p5` — security, data and persistence
- `reliability-reviewer` · `w1:p6` — testing, build and runtime reliability

### First pass: findings and worker-owned fixes

- **Domain reviewer:** High, `src/lib/mock-data.ts` — invoice totals were hardcoded and did not derive from room/meal lines and the required tax formula. Fixed with derived invoice lines, 10% service charge, 5% GST, and complimentary staff exclusion. High, `src/app/page.tsx` — new booking state was discarded and the flow did not support multiple guests/room selections. Fixed with client-side booking/invoice state, per-room pricing, capacity/date validation, and editable recipient behavior. Medium, `src/lib/types.ts` and `src/lib/mock-data.ts` — staff assignment and copied effective-date rate snapshots were incomplete. Fixed with typed staff assignments, fallback resolution and defensive snapshots.
- **UI reviewer:** High, `src/app/page.tsx` — dialog, search fields, staff toggle and data tables lacked accessible behavior. Fixed with Escape/focus handling, labels, table scopes, action labels and live toast semantics. Medium/low, `src/app/globals.css` — focus targets, print output, reduced motion and mobile table behavior needed hardening. Fixed while preserving the Timberline visual direction.
- **Security reviewer:** High, `supabase/schema.sql` — child-table RLS coverage, mutable snapshots, client-controlled invoice totals, and complimentary staff exclusion were insufficient. Fixed with admin-only policies for all 14 public tables, a recursion-safe admin helper, immutable/validated snapshots, database-owned invoice totals, and zero-priced excluded staff lines. Medium, contradictory staff accommodation flags and persistence boundary types were tightened. `.env.example` and README guidance now keep service-role credentials server-only.
- **Reliability reviewer:** High, `src/app/page.tsx` — booking creation was not durable within the mock session. Fixed with in-memory booking/invoice state and generated invoices. Medium, download/print behavior, toast timer cleanup, inert search/export controls and date validation were fixed. Added `scripts/build.mjs` for the native-SWC host workaround and `scripts/smoke.mjs` for production HTTP smoke coverage.

### Re-review pass

Each worker re-reviewed its changed area after the fixes and was asked to own any remaining correction:

- **Domain:** PASS — no critical, high or medium findings. Remaining low note: dashboard KPI presentation is intentionally mock data.
- **UI:** PASS — no high or medium findings. Remaining low note: wide tables horizontally scroll on mobile instead of reflowing into cards.
- **Security:** PASS — no high findings. Remaining medium blocker: `supabase/schema.sql` is a fresh-project schema, not a migration that retrofits constraints onto an already-deployed database. It must be applied as a reviewed migration for existing projects; SQL was not executed against a live service.
- **Reliability:** PASS — no high findings. Remaining low notes: Next emits the WASM experimental-option warning, popup-blocked print falls back to shell print, and smoke coverage is HTTP-level rather than browser interaction coverage.

### Final verification after re-review

- `npm run lint` ✅
- `npx tsc --noEmit --incremental false` ✅
- `npm run build` ✅ — production build, static generation and route optimization completed using the Node build wrapper/WASM SWC + webpack.
- `npm run smoke` ✅ — production `GET /` returned HTTP 200 and contained Timberline content.

No external services were connected and no destructive changes were made. No high-severity issues remain; the documented migration, native SWC, popup-print and browser-test limitations remain low/medium follow-up items.
