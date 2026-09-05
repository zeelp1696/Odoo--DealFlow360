# DealFlow360 Hackathon Roadmap

This is the evaluator-facing 24-hour plan. Each checkpoint is a demonstrable increment, not a disconnected CRUD screen.

## Current status

### Completed

- Database foundation: PostgreSQL schema, enums, indexes, system configuration, and idempotent demo seed data.
- Authentication: bcrypt password verification, JWT session issuance, and `/api/auth/login` plus `/api/auth/me`.
- RBAC: authenticated role middleware and protected Admin, Sales, Operations, and Customer workspace endpoints.
- Frontend foundation: React login/logout flow, session persistence, role-aware workspace display, and responsive checkpoint UI.

### Remaining

The core read/workspace surfaces are now connected. Fulfillment actions, recurring billing mutations, customer negotiation commands, and full reporting exports remain as the next hardening layer.

| Time | Module slice | Demonstrable result |
|---|---|---|
| 0-2h | Foundation + Auth/RBAC | Seed users log in, log out, and see only their role workspace. API rejects a forbidden role with 403. |
| 2-4h | Catalog + Customer data | Admin can manage products, prices, customer tiers; sales can select a customer and product. |
| 4-6h | Discount governance | Admin configures category ceilings and approval ranges; pure risk function has tests. |
| 6-8h | Quotation builder | Sales creates a quote with line/order discounts, live totals, margin, and OK/OVER indicators. |
| 8-10h | Approval routing | Submit calculates blended risk and creates manager/finance stages with an audit trail. |
| 10-12h | Upsell + warehouse | Suggestions change the quote; accepted warehouse split accounts for available stock and backorders. |
| 12-14h | Fulfillment handoff | Approved quotes become fulfillment orders; accept split and manual override are persisted. |
| 14-16h | Hybrid billing | One-time and recurring lines produce separate invoices/subscriptions. |
| 16-18h | Customer portal | Customer sees only linked quotes, can comment or counter a line discount, and cannot access internal routes. |
| 18-20h | Negotiation re-approval | Counter terms recalculate risk and re-enter approval when limits are exceeded; customer can confirm. |
| 20-22h | Payment + deal health | Payment updates invoice state; configurable stalled, anomaly, and delivery flags are visible. |
| 22-24h | Reports + hardening | CSV/report view, audit review, end-to-end run-through, seeded demo reset, architecture and demo script. |

## Module status for reviewer updates

| Module | Status | What to say in the two-hour check-in |
|---|---|---|
| Auth & RBAC | Complete | Users can log in, log out, and reach only their role workspace. |
| Database foundation | Complete | 27 tables, enums, indexes, seeded users, customers, catalog, rules, warehouses, and subscription data are migrated. |
| Customer management | Complete | Authenticated internal roles can read customer tiers; customer data is shown in the workspace. |
| Catalog & price lists | Complete | Authenticated internal roles can read products, variants, customers, and price lists; Admin can add products. |
| Discount governance | Complete | Internal roles can inspect ceilings and approval stages; Admin/Manager can add audited ceilings; blended-risk utility is tested. |
| Quotation builder | Complete | Sales Rep can create a quote, add a customer/product line, see live totals and limit status, and submit risk for approval. |
| Approval routing | Complete | Manager/Finance queues are role-protected; approve, reject, and return actions persist stage transitions and audit history. |
| Warehouse & fulfillment | Data ready | Two warehouses and split stock are seeded; split algorithm and fulfillment actions remain. |
| Upsell / cross-sell | Data ready | Three recommendation rules are seeded; suggestion API/panel remains. |
| Subscriptions & billing | Data ready | One recurring plan is seeded; subscription, invoice, and proration workflows remain. |
| Customer negotiation | Foundation only | Customer RBAC exists; quote visibility, messages, counters, and confirmation remain. |
| Payment | Not started | Build invoice payment endpoint and status transition. |
| Deal health | Configuration ready | Thresholds are seeded; stalled, anomaly, and delivery checks remain. |
| Reporting & audit | Schema ready | Audit tables exist; reporting queries, CSV export, and audit screens remain. |

## Next implementation sequence

1. Warehouse split and fulfillment handoff.
2. Upsell recommendations connected to the quotation builder.
3. Subscription and billing workflow.

This sequence creates the first credible evaluator demo: `Sales Rep -> quotation -> excessive discount -> calculated risk -> Manager approval`.

## Module dependency order

`auth -> catalog -> discounts -> quotations -> approvals -> fulfillment -> subscriptions/billing -> negotiation -> deal health/reports`

## Evaluator demo script

1. Log in as `sales@dealflow360.local`; create a quote with a discount over the Gold/Services ceiling.
2. Submit it and show the calculated risk and manager approval queue.
3. Log in as `manager@dealflow360.local`; approve it and show the next operational handoff.
4. Log in as `customer@dealflow360.local`; show the separate portal and counter-discount path.
5. Return to the approval queue, approve the re-entered risk, then show fulfillment and payment states.

## Demo accounts

All seeded users use `DealFlow360!24` locally. Never use these credentials outside the hackathon database.