# DealFlow360 — Full Problem Statement Overview

## 1. What is DealFlow360?

DealFlow360 is an **intelligent, self-governing B2B sales operations platform**.

Its purpose is to manage a business deal from:

**Quotation → Approval → Negotiation → Order → Warehouse Fulfillment → Billing → Payment → Reporting**

Unlike a simple CRM, DealFlow360 automatically applies business rules for discounts, approvals, inventory, subscriptions, customer negotiation, and deal-risk monitoring.

The problem statement focuses on **business logic, data modeling, and the end-to-end workflow**, rather than requiring a specific technology stack.

---

## 2. What business problem does it solve?

A simple sales system might work like this:

```text
Customer
   ↓
Quotation
   ↓
Order
   ↓
Invoice
```

Real B2B sales are more complicated:

- Customers ask for discounts.
- Different customers have different discount limits.
- Different product categories may have different discount limits.
- Some discounts require manager approval.
- High-risk discounts may require Finance approval.
- Stock may be distributed across multiple warehouses.
- An order can contain both one-time products and recurring subscriptions.
- Customers may negotiate after receiving a quotation.
- Negotiated changes may trigger approval again.
- Managers need to know which deals are stalled, risky, or delayed.

DealFlow360 connects all of these into one system.

---

# 3. Main Goal

Build a complete sales flow with:

- Backend configuration
- Sales workspace
- Quotation creation
- Discount governance
- Automatic approval routing
- Upsell and cross-sell recommendations
- Warehouse fulfillment
- Hybrid billing
- Customer negotiation portal
- Payment
- Deal-health monitoring
- Reporting and analytics

---

# 4. Main User Roles

## 4.1 Admin

The Admin configures the business rules and master data.

### Responsibilities

- Manage products
- Manage price lists
- Configure customer tiers
- Configure discount tiers
- Configure approval chains
- Manage warehouses
- Configure subscription plans
- Manage upsell/cross-sell rules
- View platform-wide analytics and reports

**Simple idea:**

> Admin decides how the sales system should work.

---

## 4.2 Sales Rep

The Sales Rep is the person who creates and manages the deal.

### Responsibilities

- Create quotations
- Select customers
- Add products
- Change quantities
- Apply discounts
- View live margin impact
- See upsell/cross-sell suggestions
- Track approval status
- Track fulfillment
- Respond to customer negotiation requests

**Simple idea:**

> Sales Rep wants to make the sale.

The Sales Rep does **not** decide whether a risky quotation needs approval. The system checks the configured rules and automatically routes the quotation when approval is required.

---

## 4.3 Sales Manager / Approver

The Sales Manager is the first-level approval authority.

### Responsibilities

- Review quotations requiring approval
- Approve quotations
- Reject quotations
- Return quotations for revision
- Configure discount tiers and approval chains
- Monitor deal-health problems

**Simple idea:**

> Sales Manager decides whether a risky deal is acceptable.

---

## 4.4 Finance / Operations User

Finance/Operations handles higher-risk and operational responsibilities.

### Responsibilities

- Handle second-level approval for high-risk discounts
- Manage warehouse fulfillment splits
- Handle backorder decisions
- Reconcile recurring billing
- Handle credit notes

**Simple idea:**

> Finance checks high-risk deals, while Operations helps make sure the approved order can actually be fulfilled and billed correctly.

---

## 4.5 Customer

The Customer uses a separate restricted customer portal.

### Responsibilities

- View quotations
- Ask line-level questions
- Request changes
- Counter a discount
- Confirm final quotation terms

**Simple idea:**

> Customer decides whether they accept or negotiate the proposed deal.

The customer portal must be a real separate restricted experience, not simply the internal sales screen with a different label.

---

# 5. Complete End-to-End Flow

## Step 1 — Admin configures the system

Admin creates the required setup:

```text
Products
   ↓
Price Lists
   ↓
Customer Tiers
   ↓
Discount Rules
   ↓
Approval Chains
   ↓
Warehouses
   ↓
Subscription Plans
```

Example:

```text
Gold Customer
    ↓
Normal discount ceiling = 15%

Hardware
    ↓
Allowed = 15%

Services
    ↓
Allowed = 10%
```

---

## Step 2 — Sales Rep creates quotation

Example:

```text
Customer: ACME Corp

20 × Laptop
10 × Installation Service
20 × Monthly Support
```

The quotation builder shows:

- Products
- Quantities
- Prices
- Discounts
- Totals
- Live margin

---

## Step 3 — System checks the discount

The system checks every quotation line against its applicable limits.

Example:

```text
Laptop
Allowed = 15%
Given = 12%
        ↓
       OK

Installation Service
Allowed = 10%
Given = 18%
        ↓
       VIOLATION
```

The system calculates the quotation's discount risk.

---

# 6. Blended Discount Risk

A quotation may contain multiple product categories with different limits.

Example:

```text
Laptop
Allowed: 15%
Given:   12%
→ Fine

Service
Allowed: 10%
Given:   18%
→ 8 points over
```

Even though the customer may have a general discount ceiling of 15%, the service category has a stricter limit.

Therefore, the quotation needs approval.

The system can also consider multiple smaller violations together.

Example:

```text
Line 1 → 2 points over
Line 2 → 3 points over
Line 3 → 2 points over
```

Individually these may not look severe, but together they indicate significant margin leakage.

The **blended risk score** looks at the overall quotation pattern.

---

# 7. Approval Flow

The key idea is:

**Sales Rep creates → System checks → System routes approval → Approver decides**

### Normal quotation

```text
Sales Rep
    ↓
Create Quote
    ↓
System checks rules
    ↓
Within limits
    ↓
Continue
```

### Risky quotation

```text
Sales Rep
    ↓
Create Quote
    ↓
System calculates risk
    ↓
Approval required
    ↓
Sales Manager
    ↓
Approve / Reject / Return
```

### High-risk quotation

```text
Sales Rep
    ↓
System detects high risk
    ↓
Sales Manager
    ↓
Approve
    ↓
Finance
    ↓
Approve
    ↓
Quotation Approved
```

The exact approval ranges are configurable in the system.

---

# 8. Upsell and Cross-Sell

While building a quotation, the system can recommend additional products.

Example:

```text
Recommended Product:

Extended Warranty

Margin Impact: +₹12,000
Promotion: Active

[Add to Quote]
[Dismiss]
```

Suggestions can be based on:

- Historical co-purchase data
- Active promotions
- Margin thresholds

When a recommendation is added, the quotation total and margin indicator update immediately.

---

# 9. Warehouse Fulfillment

After approval, the system checks inventory.

Example:

```text
Order requires:
20 Laptops

Main Warehouse → 12
East Depot     → 8
```

The system recommends:

```text
Main Warehouse → 12
East Depot     → 8
```

The user can:

```text
[Accept Suggested Split]
        OR
[Manual Override]
```

The system should consider stock and shipping-related factors.

If stock arrives later, the system can suggest consolidating remaining backorders.

---

# 10. Hybrid Billing

One order can contain both one-time and recurring items.

Example:

```text
Laptop
₹80,000
ONE-TIME

+

Support
₹2,000/month
RECURRING
```

Conceptually:

```text
                    ORDER
                      │
             ┌────────┴────────┐
             ↓                 ↓
         One-Time           Recurring
          Product            Service
             │                 │
          Invoice         Subscription
                               │
                        Billing Schedule
```

Recurring items need:

- Billing schedules
- Proration for mid-cycle changes
- Cancellation rules
- Partial refund/credit handling when applicable

---

# 11. Customer Portal and Negotiation

After the quotation is prepared, the customer receives access to the customer portal.

Customer can:

```text
View Quote
    ↓
Ask Questions
    ↓
Request Changes
    ↓
Counter Discount
    ↓
Confirm
```

Example:

```text
Original discount = 15%

Customer requests = 20%
```

The system recalculates the risk.

If the new terms exceed the approval threshold:

```text
Customer changes terms
        ↓
System recalculates risk
        ↓
Approval required
        ↓
Sales Manager
        ↓
Finance if required
        ↓
Approved
```

So a previously approved quotation can automatically enter the approval process again after negotiation.

---

# 12. Order, Billing and Payment

Once the customer confirms the final quotation:

```text
Quotation
    ↓
Confirmed Order
    ↓
Warehouse Fulfillment
    ↓
Invoice
    ↓
Payment
```

For recurring products:

```text
Subscription
    ↓
Billing Schedule
    ↓
Recurring Invoices
```

The system should correctly track invoice and payment status.

---

# 13. Deal Health Dashboard

Managers need visibility into problems across active deals.

The dashboard identifies:

### Stalled Deals

```text
Quotation created
       ↓
No activity for configured period
       ↓
STALLED
```

### Discount Anomalies

The system can identify unusually high discounts compared with a Sales Rep's historical behavior.

```text
Rep historical average → 7%
Current deal           → 25%

🚨 Discount Anomaly
```

### Delivery Slippage

The system can identify potential delivery-promise problems.

Managers can click an alert and open the related quotation.

---

# 14. Complete System Flow

```text
                         ADMIN
                           │
                  Configure Business
                           │
                           ↓
                    ┌─────────────┐
                    │  SALES REP  │
                    └──────┬──────┘
                           │
                    Create Quotation
                           │
                           ↓
                  ┌──────────────────┐
                  │  DISCOUNT ENGINE │
                  └────────┬─────────┘
                           │
                     Calculate Risk
                           │
                 ┌─────────┴─────────┐
                 │                   │
              Safe                 Risky
                 │                   │
                 │                   ↓
                 │             SALES MANAGER
                 │                   │
                 │             Approve / Reject
                 │                   │
                 │             High Risk?
                 │                   │
                 │                   ↓
                 │                FINANCE
                 │                   │
                 └─────────┬─────────┘
                           ↓
                     APPROVED DEAL
                           │
                 ┌─────────┴─────────┐
                 ↓                   ↓
             WAREHOUSE            BILLING
                 │                   │
              Stock              One-Time
              Split                   +
                 │                Recurring
                 └─────────┬─────────┘
                           ↓
                    CUSTOMER PORTAL
                           │
                       Negotiation
                           │
                  ┌────────┴────────┐
                  │                 │
                Accept           Changes
                  │                 │
                  │                 ↓
                  │          Risk calculated again
                  │                 │
                  │            Approval again
                  │                 │
                  └────────┬────────┘
                           ↓
                        PAYMENT
                           │
                           ↓
                      REPORTING
```

---

# 15. Main Modules

The application can be divided into these major modules:

```text
1. Authentication & RBAC
2. Customer Management
3. Product Management
4. Price List Management
5. Discount Management
6. Approval Management
7. Quotation Management
8. Sales Pipeline
9. Upsell / Cross-Sell
10. Warehouse & Inventory
11. Fulfillment
12. Subscription Management
13. Billing & Invoicing
14. Customer Portal
15. Negotiation
16. Payment
17. Deal Health & Anomaly Detection
18. Reporting & Analytics
19. Audit Logs
```

---

# 16. High-Level Data Relationships

The important business relationship is:

```text
Customer
   ↓
Quotation
   ↓
Quotation Lines
   ↓
Discount / Risk
   ↓
Approval
   ↓
Order
   ↓
Fulfillment
   ↓
Invoice
   ↓
Payment
```

Supporting data:

```text
Products
Price Lists
Customer Tiers
Discount Rules
Approval Chains
Warehouses
Stock
Subscription Plans
Subscriptions
Billing Schedules
Recommendations
Deal Alerts
Audit Logs
```

These entities should be connected through the business workflow rather than treated as unrelated CRUD modules.

---

# 17. What Makes DealFlow360 Different?

The project is NOT simply:

```text
CRM + Beautiful Dashboard
```

The important part is the **business intelligence and workflow logic**.

The system should actually calculate and enforce:

### Discount Governance

```text
Customer Tier
+
Product Category
+
Discount
        ↓
Risk
```

### Approval Routing

```text
Risk
 ↓
Who needs approval?
 ↓
Automatically route
```

### Warehouse Splitting

```text
Required Quantity
+
Warehouse Stock
+
Shipping Factors
        ↓
Recommended Fulfillment
```

### Hybrid Billing

```text
One-Time
+
Recurring
        ↓
Correct Billing
+
Proration
```

### Negotiation

```text
Customer changes deal
        ↓
Recalculate risk
        ↓
Approval again if necessary
```

The problem statement explicitly requires these core rules to be implemented in application logic, not hardcoded or faked for a demonstration.

---

# 18. What the Hackathon Expects

The required deliverables include:

### 1. Working application

```text
Frontend
+
Backend
+
Database
```

### 2. Seed/sample data

The application should be immediately testable.

### 3. Five-minute live demo

At least two complete end-to-end flows should work.

Example:

```text
Flow 1:
Quotation → Approval → Warehouse → Billing

Flow 2:
Quotation → Customer Negotiation → Reapproval → Payment
```

### 4. Architecture diagram

Should show:

- Major modules
- Data model
- System connections

### 5. Future improvements

A short explanation of what would be built with more time.

---

# 19. Quick Mental Model

Remember DealFlow360 like this:

```text
                    DEALFLOW360
                         │
                    "Make the Sale"
                         │
                         ↓
                   SALES REP
                         │
                   Create Quote
                         │
                         ↓
                SYSTEM CHECKS RULES
                         │
              ┌──────────┴──────────┐
              ↓                     ↓
            SAFE                  RISKY
              │                     │
              │                MANAGER
              │                     │
              │                  FINANCE
              │                     │
              └──────────┬──────────┘
                         ↓
                      APPROVED
                         │
                         ↓
                    FULFILLMENT
                         │
                         ↓
                       BILLING
                         │
                         ↓
                    CUSTOMER
                         │
                    Negotiates
                         │
                         ↓
                   CHECK AGAIN
                         │
                         ↓
                      PAYMENT
                         │
                         ↓
                     REPORTS
```

## One-sentence definition

> **DealFlow360 is a smart B2B sales platform that takes a deal from quotation to payment while automatically enforcing discount rules, routing approvals, recommending products, allocating warehouse stock, handling one-time and recurring billing, supporting customer negotiation, and monitoring deal health.**

---

## Source

This overview is based on the uploaded **DealFlow360 problem statement**, including its roles, modules, end-to-end flow, blended discount-risk example, technical requirements, deliverables, and quick test flow.
