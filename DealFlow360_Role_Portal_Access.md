# DealFlow360 — Role & Portal Access Specification

## Role Summary

| Role | Main Responsibility |
|---|---|
| **Admin** | Configures products, pricing, discount rules, approval chains, warehouses, subscription plans, upsell rules, users and reports. |
| **Sales Rep** | Creates quotations, adds products, applies discounts, reviews upsell recommendations, tracks approvals/fulfillment and responds to customer negotiations. |
| **Sales Manager / Approver** | Reviews risky quotations, approves/rejects/returns deals requiring manager approval, manages discount/approval configuration where authorized, and monitors deal health. |
| **Finance / Operations** | Handles high-risk approvals, warehouse fulfillment, stock splitting/backorders, recurring billing, payments and credit notes. |
| **Customer** | Uses a restricted portal to view quotations, ask questions, request changes, negotiate discounts and confirm final terms. |

## Complete Role & Permission Matrix

| Module / Action | Admin | Sales Rep | Sales Manager | Finance / Operations | Customer |
|---|---|---|---|---|---|
| Login | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage users/roles | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage products/categories | ✅ | View/Use | View | View | View quoted items |
| Manage price lists | ✅ | Use | View | View | ❌ |
| Manage customer tiers | ✅ | View | View | View | ❌ |
| Configure discount ceilings | ✅ | ❌ | ✅ / authorized | ❌ | ❌ |
| Configure approval chains | ✅ | ❌ | ✅ / authorized | ❌ | ❌ |
| Configure warehouses/stock rules | ✅ | ❌ | View | Manage/Execute | ❌ |
| Configure subscription plans | ✅ | ❌ | View | Manage/Execute | ❌ |
| Configure upsell/cross-sell | ✅ | ❌ | View | ❌ | ❌ |
| Create quotation | ❌ / optional | ✅ | ❌ / revision | ❌ | ❌ |
| Edit quotation | Support | ✅ | Review/return | Operational | Request changes |
| Add products / quantity | Support | ✅ | Review | Review | Request |
| Apply discount | Configure rules | ✅ within rules | Review/approve | Review high-risk | Counter/request |
| View live margin | ✅ | ✅ | ✅ | ✅ | ❌ |
| View/accept upsell | View | ✅ | View | ❌ | ❌ |
| Submit for approval | ❌ | ✅ | ❌ | ❌ | ❌ |
| Automatic risk check | System | System-triggered | Receives task | Receives if required | ❌ |
| Approve/reject/return | ❌ | ❌ | ✅ | ✅ when required | ❌ |
| View approval status | ✅ | ✅ | ✅ | ✅ | Restricted |
| View audit trail | ✅ | Own/relevant | Relevant | Relevant | ❌ |
| Warehouse split/fulfillment | ❌ | Track | Monitor | ✅ | View status |
| Backorders | ❌ | Track | Monitor | Manage | View status |
| Recurring billing | Configure | Track | Monitor | Manage | View |
| Proration | Configure | View | View | Execute | View |
| Refund/credit note | ❌ | Track | Monitor | Execute | View/request |
| Customer portal | Support | Respond | Monitor | Monitor | ✅ |
| Ask line-level questions | ❌ | Respond | Monitor | Monitor | ✅ |
| Request changes | ❌ | Process | Review | Review if relevant | ✅ |
| Counter discount | ❌ | Respond | Review | Review | ✅ |
| Confirm quotation | ❌ | Track | Monitor | Process | ✅ |
| Trigger re-approval | System | Receives task | Approves if routed | Approves if routed | Can cause through negotiation |
| Invoice/payment status | View | View | View | Manage | Own records |
| Deal health dashboard | ✅ | Relevant deals | ✅ | Relevant alerts | ❌ |
| Reports / PDF / XLS | ✅ | Authorized | Authorized | Authorized | ❌ |

## Admin Portal

```text
Dashboard
├── Overview
├── Analytics
└── Deal Health
Master Data
├── Products
├── Categories
├── Product Variants
├── Price Lists
└── Customer Tiers
Discount & Approval
├── Discount Rules
├── Approval Chains
└── Approval History
Inventory
├── Warehouses
├── Stock
└── Replenishment
Subscriptions
├── Subscription Plans
├── Billing Rules
└── Proration Rules
Upsell
├── Upsell Rules
├── Cross-sell Rules
└── Promotions
Reports
└── Sales / Approval / Product / Export
Administration
├── Users
├── Roles
└── System Settings
```

## Sales Rep Portal

```text
Dashboard
├── My Pipeline
├── My Quotations
└── Deal Health
Sales
├── Quotations
├── Create Quotation
└── Customers
Recommendations
└── Upsell / Cross-sell
Approvals
└── My Approval Requests
Fulfillment
├── Orders
├── Warehouse Split
└── Backorders
Billing
├── Billing Schedule
├── Invoices
└── Payments
Customer Negotiation
└── Customer Requests
```

### Sales Rep Flow

```text
Create Quote → Add Customer → Add Products → Quantity
→ Discount → Calculate Total/Margin/Risk
→ Upsell Recommendations → Submit
→ Automatic Approval Routing
```

## Sales Manager Portal

```text
Dashboard
├── Team Pipeline
├── Deal Health
└── Alerts
Approvals
├── Pending
├── Approved
├── Rejected
└── Returned
Sales
├── Team Quotations
├── Customers
└── Pipeline
Governance
├── Discount Rules
└── Approval Chains
Fulfillment
└── Order Monitoring
Reports
├── Sales Performance
├── Discount Analysis
└── Approval Analysis
```

Approval screen:

```text
Quotation → Discount Details → Blended Risk → Margin Impact
→ Approval History
→ Approve / Reject / Return
```

## Finance / Operations Portal

```text
Dashboard
├── Operations Overview
├── Financial Overview
└── Alerts
Approvals
├── High-Risk Approvals
└── Approval History
Fulfillment
├── Orders
├── Warehouse Allocation
├── Shipment Splits
└── Backorders
Billing
├── Invoices
├── Recurring Billing
├── Billing Schedule
├── Payments
├── Refunds
└── Credit Notes
Subscriptions
├── Active Subscriptions
├── Changes
└── Cancellations
Reports
├── Revenue
├── Billing
├── Fulfillment
└── Outstanding Payments
```

## Customer Portal

The customer portal is a separate restricted interface.

```text
Dashboard
├── My Deals
└── Notifications
Quotations
├── Active Quotes
├── Under Negotiation
└── Confirmed
Orders
├── My Orders
└── Delivery Status
Billing
├── Invoices
├── Payments
└── Billing Schedule
Support
└── Questions / Requests
```

Customer quote actions:

```text
View Quote
├── Ask Question
├── Request Change
├── Counter Discount
└── Confirm
```

## Complete End-to-End Workflow

```text
ADMIN
  ↓
Configure Products + Pricing + Discount Rules
+ Approval Chains + Warehouses + Subscription Plans
  ↓
SALES REP
  ↓
Create Quote → Add Products → Apply Discount
  ↓
System Calculates Total + Margin + Discount Risk
  ↓
Upsell Recommendation
  ↓
Submit Quote
  ↓
Automatic Risk Check
  ├── No approval required → Continue
  └── Approval required → SALES MANAGER
                              ↓
                       Approve / Reject / Return
                              ↓
                       Finance Required?
                         ├── No → Continue
                         └── Yes → FINANCE / OPS
                                      ↓
                              Approval / Processing
                                      ↓
                              CUSTOMER PORTAL
                                      ↓
                         Question / Change / Counter
                                      ↓
                              System Re-checks
                              ├── Within rules → Continue
                              └── Exceeds rules → Re-approval
                                      ↓
                              Customer Confirms
                                      ↓
                                   ORDER
                                      ↓
                            Warehouse Stock Check
                                      ↓
                              Warehouse Split
                                      ↓
                         Shipment / Backorder
                                      ↓
                                  BILLING
                           ├── One-time invoice
                           └── Recurring schedule
                                      ↓
                                  PAYMENT
                                      ↓
                              DEAL HEALTH
                                      ↓
                                  REPORTING
```

## Discount & Blended Risk Logic

Example:

```text
Customer Tier = Gold
Gold Maximum = 15%

Hardware Maximum = 15%
Service Maximum = 10%

Laptop        → 12% → OK
Setup Service → 18% → Violation
```

Therefore:

```text
Quote
 ↓
Check every line
 ↓
Service exceeds category ceiling
 ↓
Risk detected
 ↓
Manager approval
```

The system should also calculate combined/blended risk across quotation lines and route the quote to the highest required approval level.

## Customer Negotiation

```text
Sales Rep creates quote
 ↓
Internal approval
 ↓
Customer receives quote
 ↓
Customer negotiates
 ├── Question
 ├── Change request
 └── Counter discount
 ↓
System recalculates total + margin + risk
 ↓
Threshold exceeded?
 ├── No → Continue
 └── Yes → Re-approval
 ↓
Customer confirms
```

## Fulfillment

```text
Confirmed Order
 ↓
Check warehouse stock
 ↓
Find recommended allocation
 ↓
Split quantities
 ↓
Calculate shipment/cost
 ↓
Accept or override
 ↓
Fulfillment
 ↓
Missing stock → Backorder
 ↓
Stock arrives → Fulfill remaining quantity
```

## Billing

```text
Confirmed Quote
 ↓
Identify line type
 ├── One-time → Invoice
 └── Recurring → Billing Schedule
                       ↓
                    Future Bills
                       ↓
               Proration if changed
                       ↓
              Refund / Credit Note
```

## Deal Health

| Alert | Purpose |
|---|---|
| Stalled Quote | Detect inactive deals |
| Discount Anomaly | Detect unusual discounts versus rep history |
| Delivery Slippage | Detect fulfillment delays |
| Approval Delay | Detect deals waiting too long |
| Negotiation Activity | Surface active customer changes |

## Audit Trail

Every important approval, rejection, edit and negotiation event should record:

| Field | Example |
|---|---|
| Event | Discount Changed |
| User | Sales Rep |
| Timestamp | Date/Time |
| Reason | Customer request |

## MVP Build Priority

1. Authentication & RBAC
2. Admin configuration
3. Quotation builder
4. Discount/risk/approval engine
5. Customer negotiation portal
6. Warehouse fulfillment
7. One-time + recurring billing
8. Upsell, deal health and reporting

## Five-Minute Hackathon Demo

```text
Admin configures Gold tier + discount ceiling + approval chain
        ↓
Sales Rep creates quote with over-limit service discount
        ↓
System automatically routes to Sales Manager
        ↓
Manager sees risk + margin and approves
        ↓
Rep accepts upsell → total/margin updates
        ↓
Customer opens restricted portal
        ↓
Customer counters discount
        ↓
System detects new threshold violation
        ↓
Quote goes back to approval
        ↓
Approval completed
        ↓
Customer confirms
        ↓
Operations sees warehouse split
        ↓
One-time invoice + recurring billing schedule generated
        ↓
Manager views deal health/reporting
```

## Core Product Principle

**DealFlow360 should govern the deal automatically instead of merely recording what the sales team does.**

The important business logic should be real application logic:

```text
Discount Governance
      ↓
Risk Calculation
      ↓
Approval Routing
      ↓
Customer Negotiation
      ↓
Risk Recalculation
      ↓
Warehouse Allocation
      ↓
Billing / Proration
      ↓
Deal Health
```

> The problem statement specifically expects the core business rules, approval routing, warehouse splitting, billing/proration and customer negotiation to be implemented as real working logic rather than static or fake screens.
