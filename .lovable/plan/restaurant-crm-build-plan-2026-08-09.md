# Restaurant CRM — Build Plan

## Goal
A restaurant CRM with a central dashboard, inventory/usage tracking, sales reporting, bank/POS linking, and delivery-platform integrations (DoorDash, Uber Eats, Grubhub, etc.).

## Open Decision

**User profiles:** Do you need to store extra user profile data (restaurant name, role, avatar, preferences), or is email-only auth enough? This determines whether we add a `profiles` table.

## Phase 1 — Foundation (start here)
1. Enable Lovable Cloud (database + auth + server functions).
2. Set up authentication (email/password + Google by default).
3. Create core database schema:
   - `restaurants` (name, location, settings)
   - `inventory_items` (name, unit, current_stock, reorder_level)
   - `inventory_transactions` (in/out, reason, quantity, timestamp)
   - `sales` (order source, total, tax, timestamp, platform)
   - `usage_logs` (item, quantity used, linked sale or manual entry)
4. Seed demo data so the dashboard is not empty.

## Phase 2 — Dashboard
1. Replace the placeholder `/` route with a restaurant dashboard.
2. Build summary cards: total sales today, active orders, low-stock alerts, net revenue.
3. Add charts: sales over time, sales by platform, inventory levels.
4. Recent activity feed (sales, stock changes).

## Phase 3 — Inventory & Usage
1. Inventory list page with stock levels and alerts.
2. Add/edit inventory items.
3. Log usage manually or auto-deduct from sales.
4. Low-stock notifications.

## Phase 4 — Sales & Orders
1. Sales list with filters by date and platform.
2. Manual sales entry form.
3. Sales detail view.
4. Basic reporting (daily/weekly/monthly).

## Phase 5 — Integrations
1. **Bank / POS:** Connect via available connectors (Plaid, Square, Stripe) or store connection details for later.
2. **Delivery platforms:** DoorDash, Uber Eats, Grubhub — connect where connectors exist, otherwise build webhook/API endpoints to receive order data.
3. Sync incoming orders into `sales` and auto-deduct inventory.

## Phase 6 — Polish
1. Responsive design.
2. Role-based access (owner, manager, staff).
3. Settings page.
4. Export reports.

## Technical Notes
- Stack: TanStack Start + Lovable Cloud + Tailwind CSS v4.
- Server functions for all database reads/writes.
- Public API routes under `/api/public/*` for delivery-platform webhooks.
- Connector gateway for bank/POS/delivery integrations where available.

## Credit Approach
Build in phases. Each phase is a natural stopping point, so you can review and decide whether to continue. I cannot estimate the exact credit cost, but starting with Phase 1 + Phase 2 gives you a working dashboard with real data first.
