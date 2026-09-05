# DealFlow360 — Execution Plan (Zero Code Written Yet)

Baseline: `schema.sql` (finalized, gap-fixed) + `DealFlow360_Module_Wise_Plan.md` (13 modules, corrected 18-screen map). This plan sequences the actual build, day by day / hour by hour, vertical-slice first — a full quotation → approval → fulfillment → billing → payment path works early, then widens.

---

## Phase 0 — Setup (before any module code)

- [ ] Install PostgreSQL locally, create empty `dealflow360` database
- [ ] Run `schema.sql` as-is — verify all 20 tables + 3 enums + indexes create cleanly
- [ ] Write `seed.sql`: 1 admin, 1 sales_rep, 1 sales_manager, 1 finance user, 2 sales_teams, 2 customers (one Gold, one Bronze), 1 customer-portal user linked to Gold customer
- [ ] Scaffold `/backend` (Node + Express + pg): `app.js`, `/config/db.js` (pg pool), `.env` for connection string
- [ ] Scaffold `/frontend` (React + React Router + Axios): base routes, `AuthContext.js` skeleton
- [ ] Confirm both scaffolds boot with no errors before writing any module logic

**Exit check:** `npm run dev` on backend responds on a health-check route; frontend renders a blank login page. No module logic yet — this phase is pure plumbing.

---

## Phase 1 — Foundation Modules (must exist before anything else)

Build order matters here — each of these is a hard dependency for later modules.

**1. `auth`**
- [ ] `users`, `sales_teams` tables already in schema — wire signup/login endpoints
- [ ] bcrypt hash + JWT issue, `authGuard` + `roleGuard` middleware
- [ ] Screen 1 (Login/Signup) in React, `AuthContext` fully wired
- [ ] Seed users log in successfully with correct role claims

**2. `catalog`**
- [ ] CRUD `/api/products`, `/api/variants`, `/api/price-lists`
- [ ] Product Catalog screen + Product & Price Lists screen (2 separate admin screens per mockup)
- [ ] Seed: Hardware + Services + Subscriptions categories, at least 4 products spread across them

**3. `discounts`**
- [ ] CRUD `/api/discount-ceilings`, `/api/approval-chain-rules`
- [ ] Discount Tiers & Approval Chain Setup screen
- [ ] Write `utils/blendedRiskScore.js` now (pure function, unit-testable before UI exists)
- [ ] Seed: Gold/Hardware=15%, Gold/Services=10% (matches the PDF's own worked example exactly — use this for your demo)
- [ ] Every ceiling/chain edit writes to `edit_audit_log`

**4. `warehouses`**
- [ ] CRUD `/api/warehouses`, `/api/stock`
- [ ] Write `utils/warehouseSplit.js`
- [ ] Seed: 2 warehouses with overlapping stock on at least one product (to force a split scenario)

**Exit check:** you can log in as each role, see seeded products/ceilings/warehouses through basic admin tables. No quotation logic yet.

---

## Phase 2 — Core Differentiator: Quotation + Live Risk Check

This is the single most important slice — it's what makes DealFlow360 not just a CRUD app.

**5. `quotations`**
- [ ] `GET/POST /api/quotations`, `POST /api/quotations/:id/lines`, `POST /api/quotations/:id/submit`
- [ ] Sales Dashboard Home (Screen 2), Quotations List/Pipeline (Screen 3), Quotation Builder (Screen 4)
- [ ] Wire `blendedRiskScore.js` to run live on every discount edit — OK/OVER badge per line updates instantly
- [ ] Support both `discount_mode='LINE'` and `'ORDER'`
- [ ] Submit routes to `approvals` if risk requires it, else straight to `fulfillment`

**Exit check (mirrors PDF Quick Test steps 1–3):** create a quotation, add a line with a discount above its category ceiling, confirm it auto-flags for approval without manual triggering.

**6. `upsell`**
- [ ] CRUD `/api/upsell-rules`, `GET /api/quotations/:id/suggestions`
- [ ] Upsell panel beside the Quotation Builder cart
- [ ] Seed 2–3 pairings with margin thresholds, one promoted item

**Exit check (Quick Test step 4):** accept a suggestion, confirm order total + margin indicator update immediately.

---

## Phase 3 — Approval + Fulfillment State Machine

**7. `approvals`**
- [ ] `GET /api/approvals`, `PATCH /api/approvals/:id`
- [ ] Approvals List (Screen 5), Approval Detail (Screen 6)
- [ ] Manager → Finance stage sequencing per `approval_chain_rules`, full audit trail rendered from `approval_audit_log`

**Exit check (Quick Test step 5, part 1):** approve a flagged quotation, confirm the stage sequence enforces Manager-then-Finance when required.

**8. `fulfillment`**
- [ ] `GET /api/fulfillment`, `POST /api/fulfillment/:id/accept-split`, `PATCH /api/fulfillment/:id/override`
- [ ] Fulfillment List (Screen 7), Fulfillment Detail (Screen 8)
- [ ] Wire `warehouseSplit.js`, Accept/Manual Override, backorder + "Consolidate Remaining Backorder" auto-prompt

**Exit check (Quick Test step 5, part 2):** confirm stock pulls from the correct warehouse, splitting across two if needed.

---

## Phase 4 — Billing + Negotiation Loop

**9. `subscriptions`**
- [ ] CRUD `/api/subscription-plans`, `GET/PATCH /api/subscriptions`
- [ ] Subscriptions List (Screen 9), Billing Detail (Screen 10)
- [ ] Write `utils/proration.js`, cancellation → credit note

**10. `billing`**
- [ ] `GET /api/invoices`, `POST /api/invoices/:id/pay`
- [ ] Invoices List (Screen 12), Invoice Detail (Screen 13)
- [ ] One-time vs recurring lines generate separate invoice records

**Exit check (Quick Test step 6):** one-time product + recurring subscription on the same order bill correctly and separately.

**11. `negotiation`**
- [ ] `GET/POST /api/quotations/:id/negotiation`, `POST /api/quotations/:id/confirm`
- [ ] Customer Portal Negotiation Screen (Screen 11) — genuinely separate restricted view, own login
- [ ] On Confirm: re-run blended risk score if counter-discount exceeds threshold → re-creates `approvals` row automatically

**Exit check (Quick Test steps 7–8):** as the customer, request a bigger discount, confirm it re-enters approval automatically; confirm the order, record payment, confirm invoice status updates.

---

## Phase 5 — Monitoring + Reporting (polish layer)

**12. `dealhealth`**
- [ ] `GET /api/deal-health`, `GET/PATCH /api/system-config`
- [ ] Deal Health and Anomaly Dashboard (Screen 14)
- [ ] Stalled/anomaly/slippage checks read from `system_config`, not hardcoded constants

**13. `reports`**
- [ ] `GET /api/reports?period&rep&team&status&category`
- [ ] Reports screen + Admin Reporting Dashboard/Uploads screen (2 separate mockup panels)
- [ ] CSV export is sufficient; team filter now works via `sales_teams`

---

## Final Phase — Full Run-Through

- [ ] Walk all 8 PDF Quick Test steps end-to-end, back to back, no resets between steps
- [ ] Fix anything that breaks silently between modules (most bugs will be at hand-off points: quotation→approval, approval→fulfillment, negotiation→approval re-entry)
- [ ] Prepare the 5-minute demo script directly from the Quick Test steps
- [ ] Draft the one-page architecture diagram (use the module dependency list from `DealFlow360_Module_Wise_Plan.md`)
- [ ] Write the "what we'd build next" note (multi-currency, real PDF export, magic-link auth, automated deal-health cron — all explicitly out-of-scope items already agreed)

---

## Build Order Summary (dependency chain, top to bottom)

```
auth → catalog → discounts → warehouses
                    ↓
              quotations ← upsell
                    ↓
              approvals → fulfillment
                    ↓
    subscriptions → billing
                    ↓
              negotiation (re-enters approvals + fulfillment)
                    ↓
          dealhealth + reports (read-only, build last)
```

Nothing after `quotations` can be meaningfully tested until `discounts` + `catalog` + `auth` are solid — protect that foundation phase, it's the one place a delay compounds into every later module.
