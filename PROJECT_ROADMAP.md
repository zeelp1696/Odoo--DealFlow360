# DealFlow360 Hackathon Roadmap

This is the evaluator-facing 24-hour plan. Each checkpoint is a demonstrable increment, not a disconnected CRUD screen.

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