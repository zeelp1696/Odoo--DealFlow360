-- =====================================================================
-- DealFlow360 — FINAL DATABASE SCHEMA (PostgreSQL, offline)
-- Verified against Problem Statement section by section.
-- Includes all 4 gap-fixes agreed on: order-level discount, full edit
-- audit log, sales team grouping, and tunable system config.
-- =====================================================================

-- ===================== AUTH & USERS =====================
CREATE TYPE user_role AS ENUM ('sales_rep','sales_manager','finance','admin','customer');

CREATE TABLE sales_teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(160) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    customer_id INT NULL,              -- set only when role = 'customer'
    sales_team_id INT REFERENCES sales_teams(id) NULL,  -- [GAP FIX 3] team grouping for reports
    created_at TIMESTAMP DEFAULT now()
);

-- ===================== CUSTOMERS =====================
CREATE TYPE customer_tier AS ENUM ('Bronze','Silver','Gold');

CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    tier customer_tier NOT NULL DEFAULT 'Bronze',
    currency VARCHAR(10) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT now()
);

ALTER TABLE users ADD CONSTRAINT fk_user_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id);

-- ===================== PRODUCTS / VARIANTS / PRICE LISTS (A2) =====================
CREATE TYPE product_category AS ENUM ('Hardware','Services','Subscriptions');

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    category product_category NOT NULL,
    base_price NUMERIC(12,2) NOT NULL,
    unit VARCHAR(30) DEFAULT 'unit',
    tax_percent NUMERIC(5,2) DEFAULT 0,
    description TEXT,
    margin_percent NUMERIC(5,2) DEFAULT 20,  -- used by upsell margin-threshold + margin indicator
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE product_variants (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    attribute_name VARCHAR(60) NOT NULL,   -- e.g. "Size", "Pack"
    attribute_value VARCHAR(60) NOT NULL,
    extra_price NUMERIC(12,2) DEFAULT 0
);

CREATE TABLE price_lists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    tier customer_tier NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD'
);

CREATE TABLE price_list_items (
    id SERIAL PRIMARY KEY,
    price_list_id INT REFERENCES price_lists(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    price NUMERIC(12,2) NOT NULL
);

-- ===================== DISCOUNT TIERS & APPROVAL CHAINS (A3) =====================
CREATE TABLE discount_tier_ceilings (
    id SERIAL PRIMARY KEY,
    tier customer_tier NOT NULL,
    category product_category NOT NULL,
    max_discount_percent NUMERIC(5,2) NOT NULL   -- e.g. Gold/Hardware=15, Gold/Services=10
);

CREATE TABLE approval_chain_rules (
    id SERIAL PRIMARY KEY,
    min_over_limit_points NUMERIC(5,2) NOT NULL,  -- lower bound of "points over limit"
    max_over_limit_points NUMERIC(5,2),            -- null = open-ended
    requires_manager BOOLEAN DEFAULT true,
    requires_finance BOOLEAN DEFAULT false,
    risk_label VARCHAR(20) NOT NULL                -- LOW / MEDIUM / HIGH
);

-- ===================== WAREHOUSES (A4) =====================
CREATE TABLE warehouses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    shipping_cost_weight NUMERIC(6,2) DEFAULT 1.0, -- used by split-minimization logic
    replenishment_rule TEXT
);

CREATE TABLE warehouse_stock (
    id SERIAL PRIMARY KEY,
    warehouse_id INT REFERENCES warehouses(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    in_stock INT NOT NULL DEFAULT 0,
    reserved INT NOT NULL DEFAULT 0
    -- available = in_stock - reserved (computed in queries)
);

-- ===================== SUBSCRIPTION PLANS (A5) =====================
CREATE TYPE billing_cycle AS ENUM ('Monthly','Quarterly','Yearly');

CREATE TABLE subscription_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    product_id INT REFERENCES products(id),
    cycle billing_cycle NOT NULL,
    price NUMERIC(12,2) NOT NULL,
    proration_rule TEXT,             -- e.g. "daily-prorate-on-qty-change"
    cancellation_rule TEXT,
    partial_refund_percent NUMERIC(5,2) DEFAULT 0
);

-- ===================== UPSELL / CROSS-SELL RULES (A6) =====================
CREATE TABLE upsell_rules (
    id SERIAL PRIMARY KEY,
    base_product_id INT REFERENCES products(id),
    suggested_product_id INT REFERENCES products(id),
    co_purchase_score NUMERIC(5,2) DEFAULT 0,  -- historical co-purchase strength -> ranking
    is_promoted BOOLEAN DEFAULT false,
    promo_label VARCHAR(60),
    min_margin_percent NUMERIC(5,2) DEFAULT 0  -- only surfaces if suggested product's margin >= this
);

-- ===================== QUOTATIONS (B2, B3) =====================
CREATE TYPE quotation_status AS ENUM
    ('Draft','Pending Approval','Approved','Negotiation','Confirmed','Rejected');

CREATE TABLE quotations (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,   -- e.g. Q-1042
    customer_id INT REFERENCES customers(id),
    rep_id INT REFERENCES users(id),
    price_list_id INT REFERENCES price_lists(id),
    status quotation_status DEFAULT 'Draft',
    blended_risk_score NUMERIC(6,2),
    risk_label VARCHAR(20),
    discount_mode VARCHAR(10) DEFAULT 'LINE',        -- [GAP FIX 1] 'LINE' or 'ORDER'
    order_discount_percent NUMERIC(5,2) DEFAULT 0,   -- [GAP FIX 1] used when discount_mode='ORDER'
    last_activity_at TIMESTAMP DEFAULT now(),
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE quotation_lines (
    id SERIAL PRIMARY KEY,
    quotation_id INT REFERENCES quotations(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id),
    variant_id INT REFERENCES product_variants(id) NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL,
    discount_percent NUMERIC(5,2) DEFAULT 0,
    allowed_limit_percent NUMERIC(5,2),  -- resolved from discount_tier_ceilings at add-time
    over_limit_points NUMERIC(5,2) DEFAULT 0,
    line_status VARCHAR(10) DEFAULT 'OK', -- OK / OVER
    is_subscription_line BOOLEAN DEFAULT false,
    subscription_plan_id INT REFERENCES subscription_plans(id) NULL
);

-- ===================== APPROVALS (B4) =====================
CREATE TABLE approvals (
    id SERIAL PRIMARY KEY,
    quotation_id INT REFERENCES quotations(id) ON DELETE CASCADE,
    requires_manager BOOLEAN DEFAULT true,
    requires_finance BOOLEAN DEFAULT false,
    current_stage VARCHAR(20) DEFAULT 'Sales Manager', -- Sales Manager / Finance / Done
    status VARCHAR(20) DEFAULT 'Pending',               -- Pending / Approved / Rejected / Returned
    assigned_to INT REFERENCES users(id) NULL,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE approval_audit_log (
    id SERIAL PRIMARY KEY,
    approval_id INT REFERENCES approvals(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id),
    action VARCHAR(30) NOT NULL,  -- Submitted / Returned / Resubmitted / Approved / Rejected
    note TEXT,
    created_at TIMESTAMP DEFAULT now()
);

-- [GAP FIX 2] Generic edit audit log — covers PS requirement that
-- "all approvals, rejections, AND EDITS must be logged with user, timestamp, reason"
-- Captures line edits, discount edits, and backend config edits (ceilings, chains, etc.)
CREATE TABLE edit_audit_log (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(30) NOT NULL,  -- 'quotation_line','discount_tier_ceiling','approval_chain_rule','subscription_plan', etc.
    entity_id INT NOT NULL,
    user_id INT REFERENCES users(id),
    action VARCHAR(30) NOT NULL,       -- 'Created','Updated','Deleted'
    before_value JSONB,
    after_value JSONB,
    reason TEXT,
    created_at TIMESTAMP DEFAULT now()
);

-- ===================== FULFILLMENT (B6) =====================
CREATE TYPE fulfillment_status AS ENUM ('Split Pending','Backorder','Fulfilled');

CREATE TABLE fulfillment_orders (
    id SERIAL PRIMARY KEY,
    quotation_id INT REFERENCES quotations(id) ON DELETE CASCADE,
    status fulfillment_status DEFAULT 'Split Pending'
);

CREATE TABLE fulfillment_splits (
    id SERIAL PRIMARY KEY,
    fulfillment_order_id INT REFERENCES fulfillment_orders(id) ON DELETE CASCADE,
    warehouse_id INT REFERENCES warehouses(id),
    product_id INT REFERENCES products(id),
    qty_fulfilled INT NOT NULL,
    estimated_shipments INT DEFAULT 1,
    estimated_cost NUMERIC(10,2),
    is_manual_override BOOLEAN DEFAULT false,
    backorder_qty INT DEFAULT 0
);

-- ===================== SUBSCRIPTIONS / BILLING (B7) =====================
CREATE TYPE subscription_status AS ENUM ('Active','Paused','Cancelled');

CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    quotation_id INT REFERENCES quotations(id),
    customer_id INT REFERENCES customers(id),
    plan_id INT REFERENCES subscription_plans(id),
    quantity INT DEFAULT 1,
    next_bill_date DATE,
    status subscription_status DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE credit_notes (
    id SERIAL PRIMARY KEY,
    subscription_id INT REFERENCES subscriptions(id),
    amount NUMERIC(12,2),
    reason VARCHAR(120),
    created_at TIMESTAMP DEFAULT now()
);

-- ===================== INVOICES / PAYMENTS (B7 + Quick Test step 8) =====================
CREATE TYPE invoice_status AS ENUM ('Unpaid','Paid');

CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(20) UNIQUE NOT NULL,  -- INV-1042
    quotation_id INT REFERENCES quotations(id),
    subscription_id INT REFERENCES subscriptions(id) NULL,  -- null if it's the one-time invoice
    amount NUMERIC(12,2) NOT NULL,
    is_recurring BOOLEAN DEFAULT false,
    status invoice_status DEFAULT 'Unpaid',
    due_date DATE,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES invoices(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    paid_at TIMESTAMP DEFAULT now()
);

-- ===================== CUSTOMER NEGOTIATION (B8) =====================
CREATE TABLE negotiation_messages (
    id SERIAL PRIMARY KEY,
    quotation_id INT REFERENCES quotations(id) ON DELETE CASCADE,
    quotation_line_id INT REFERENCES quotation_lines(id) NULL,  -- line-level comment, nullable for general
    sender_role VARCHAR(20),   -- customer / rep
    comment TEXT,
    counter_discount_percent NUMERIC(5,2) NULL,
    requested_delivery_date DATE NULL,
    created_at TIMESTAMP DEFAULT now()
);

-- ===================== DEAL HEALTH (B9) =====================
CREATE TABLE deal_health_flags (
    id SERIAL PRIMARY KEY,
    quotation_id INT REFERENCES quotations(id) ON DELETE CASCADE,
    flag_type VARCHAR(30) NOT NULL,  -- Stalled / DiscountAnomaly / DeliverySlippage
    detail TEXT,
    created_at TIMESTAMP DEFAULT now()
);

-- [GAP FIX 4] Tunable system config — covers PS requirement for a
-- "configured number of days" (stalled deals) and a rep's "historical
-- average" anomaly threshold, without hardcoding these in application code.
CREATE TABLE system_config (
    key VARCHAR(60) PRIMARY KEY,
    value VARCHAR(120) NOT NULL,
    description TEXT
);

INSERT INTO system_config (key, value, description) VALUES
('stalled_deal_days', '5', 'Days of inactivity before a quotation is flagged as stalled'),
('anomaly_multiplier', '1.5', 'Multiplier over a rep''s historical average discount to flag a discount anomaly'),
('delivery_slippage_days', '3', 'Days past estimated delivery before a delivery-promise-slippage flag is raised');

-- ===================== INDEXES (performance, offline single-node safe) =====================
CREATE INDEX idx_quotation_lines_quotation ON quotation_lines(quotation_id);
CREATE INDEX idx_quotations_rep ON quotations(rep_id);
CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_quotations_last_activity ON quotations(last_activity_at);
CREATE INDEX idx_warehouse_stock_product ON warehouse_stock(product_id);
CREATE INDEX idx_invoices_quotation ON invoices(quotation_id);
CREATE INDEX idx_negotiation_quotation ON negotiation_messages(quotation_id);
CREATE INDEX idx_edit_audit_entity ON edit_audit_log(entity_type, entity_id);
