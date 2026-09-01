# The Timberline · Hotel management system

A focused hotel-operations MVP for a Bhutan property in Paro. It gives an administrator one calm workspace for the front desk, reservations, agent rates and customer invoices.

## Product rules

- Rooms use **room-type prices charged per room**. One booking can include multiple tourists and multiple rooms.
- Travel-agent profiles save negotiated room and meal presets, with effective dates and active/inactive state. A booking stores a rate snapshot so later rate edits never alter historical invoices.
- Rate fallback is **travel-agent preset → walk-in rate → local default**. Walk-in and local bookings default the invoice recipient to the tourist; agent bookings default it to the agent. The recipient remains editable.
- Tourists receive fixed set-menu breakfast, lunch and dinner priced per person. Locals use per-person a-la-carte food pricing.
- Groups may include optional guides and drivers. The default setup is one male guide and one male driver, but gender, capacity and accommodation assignment are configurable. Staff accommodation can be complimentary or external when rooms are full.
- Complimentary guide/driver accommodation and meals are operational costs, not customer invoice lines.
- Invoices use Nu. (ngultrum), add a 10% service charge to subtotal, then apply 5% GST to subtotal plus service charge. They are printable from the invoice register.
- The product intentionally has one role for this MVP: admin.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app works with realistic in-memory mock data when Supabase credentials are absent.

Validation commands:

```bash
npm run lint
npm run typecheck
npm run build
npm run smoke
```

## Supabase

Copy `.env.example` to `.env.local`, add the project URL and anon key, then run `supabase/schema.sql` in the Supabase SQL editor. The schema includes room types and physical rooms, tourists, bookings with many-to-many guests and rooms, travel-agent rates, immutable rate snapshots, configurable booking staff and invoice lines. Every public table has RLS enabled; signed-in access is admin-only and the anonymous API role has no table privileges.

Create the first `profiles` row with a trusted Supabase SQL editor/server-side bootstrap step after the corresponding `auth.users` row exists. Do not use or expose the optional service-role key in browser code. Normal application writes use the anon key plus the authenticated session and are still subject to RLS.

The UI keeps its mock-data boundary in `src/lib/mock-data.ts`. The `Db*Record` types in `src/lib/types.ts` mirror persisted snake_case rows, while the models below them are hydrated UI models. A Supabase adapter must join link tables, parse PostgreSQL `numeric` values before using them as JavaScript numbers, and never accept client-supplied invoice totals or overwrite a rate snapshot.

Database protections recalculate invoice subtotal/service charge/GST/total from non-complimentary lines, reject billed complimentary staff lines, and prevent paid invoice lines and rate snapshots from being changed. Treat cancelled bookings as the deletion path so the rate-snapshot audit trail remains intact.

## Interface

The UI is a distinctive operations desk rather than a generic admin template: dark forest navigation, parchment-white work surface, Bhutan-inspired coral/sage accents, serif hospitality headings and dense, legible data tables. The dashboard leads with the live room board, arrivals, recent bookings and invoice pulse. Bookings, guest directory, agent rate desk and invoice register are navigable from the sidebar. The “New booking” flow demonstrates guest type, rate profile, room count, staff defaults and invoice-recipient logic, with a confirmation toast.

This is a [Next.js](https://nextjs.org) App Router project and is ready to deploy on Vercel after connecting Supabase.
