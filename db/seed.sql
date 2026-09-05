-- Demo credentials for the first evaluator checkpoint. Change these outside local demos.
INSERT INTO sales_teams (name)
SELECT source.name
FROM (VALUES ('Enterprise'), ('Commercial')) AS source(name)
WHERE NOT EXISTS (SELECT 1 FROM sales_teams team WHERE team.name = source.name);

INSERT INTO customers (name, tier, currency)
SELECT source.name, source.tier::customer_tier, source.currency
FROM (VALUES ('ACME Corporation', 'Gold', 'USD'), ('Northstar Services', 'Bronze', 'USD')) AS source(name, tier, currency)
WHERE NOT EXISTS (SELECT 1 FROM customers customer_record WHERE customer_record.name = source.name);

INSERT INTO users (name, email, password_hash, role, customer_id, sales_team_id)
VALUES
  ('Ava Admin', 'admin@dealflow360.local', '$2a$10$LNyDxYlMJlHbJEHkod13K.ateoqoZ81V8S8Q99n3SQvAxqM7MRcQO', 'admin', NULL, (SELECT id FROM sales_teams WHERE name = 'Enterprise')),
  ('Sam Sales', 'sales@dealflow360.local', '$2a$10$LNyDxYlMJlHbJEHkod13K.ateoqoZ81V8S8Q99n3SQvAxqM7MRcQO', 'sales_rep', NULL, (SELECT id FROM sales_teams WHERE name = 'Enterprise')),
  ('Maya Manager', 'manager@dealflow360.local', '$2a$10$LNyDxYlMJlHbJEHkod13K.ateoqoZ81V8S8Q99n3SQvAxqM7MRcQO', 'sales_manager', NULL, (SELECT id FROM sales_teams WHERE name = 'Enterprise')),
  ('Finn Finance', 'finance@dealflow360.local', '$2a$10$LNyDxYlMJlHbJEHkod13K.ateoqoZ81V8S8Q99n3SQvAxqM7MRcQO', 'finance', NULL, (SELECT id FROM sales_teams WHERE name = 'Commercial')),
  ('Casey Customer', 'customer@dealflow360.local', '$2a$10$LNyDxYlMJlHbJEHkod13K.ateoqoZ81V8S8Q99n3SQvAxqM7MRcQO', 'customer', (SELECT id FROM customers WHERE name = 'ACME Corporation'), NULL)
ON CONFLICT (email) DO NOTHING;

-- Password for every demo user: DealFlow360!24

-- ===================== CATALOG =====================
INSERT INTO products (name, category, base_price, unit, tax_percent, description, margin_percent)
SELECT source.name, source.category::product_category, source.base_price, source.unit, source.tax_percent, source.description, source.margin_percent
FROM (VALUES
  ('ProBook X1', 'Hardware', 1200.00, 'unit', 18.00, 'Business laptop for enterprise teams', 24.00),
  ('SecureDock 4K', 'Hardware', 240.00, 'unit', 18.00, 'USB-C docking station', 30.00),
  ('Installation Service', 'Services', 350.00, 'service', 18.00, 'On-site deployment and configuration', 45.00),
  ('Monthly Support', 'Subscriptions', 120.00, 'user/month', 18.00, 'Priority technical support subscription', 55.00),
  ('Extended Warranty', 'Services', 180.00, 'unit', 18.00, 'Three-year hardware protection', 60.00)
) AS source(name, category, base_price, unit, tax_percent, description, margin_percent)
WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.name = source.name);

INSERT INTO product_variants (product_id, attribute_name, attribute_value, extra_price)
SELECT p.id, 'Memory', '32 GB', 180.00
FROM products p
WHERE p.name = 'ProBook X1'
  AND NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id AND v.attribute_value = '32 GB');

INSERT INTO price_lists (name, tier, currency)
SELECT source.name, source.tier::customer_tier, source.currency
FROM (VALUES ('Gold Standard Price List', 'Gold', 'USD'), ('Bronze Standard Price List', 'Bronze', 'USD')) AS source(name, tier, currency)
WHERE NOT EXISTS (SELECT 1 FROM price_lists pl WHERE pl.name = source.name);

INSERT INTO price_list_items (price_list_id, product_id, price)
SELECT pl.id, p.id, CASE WHEN pl.tier = 'Gold' THEN p.base_price * 0.97 ELSE p.base_price END
FROM price_lists pl CROSS JOIN products p
WHERE pl.name IN ('Gold Standard Price List', 'Bronze Standard Price List')
  AND NOT EXISTS (SELECT 1 FROM price_list_items item WHERE item.price_list_id = pl.id AND item.product_id = p.id);

-- ===================== DISCOUNT GOVERNANCE =====================
INSERT INTO discount_tier_ceilings (tier, category, max_discount_percent)
SELECT source.tier::customer_tier, source.category::product_category, source.max_discount
FROM (VALUES
  ('Gold', 'Hardware', 15.00), ('Gold', 'Services', 10.00), ('Gold', 'Subscriptions', 12.00),
  ('Bronze', 'Hardware', 8.00), ('Bronze', 'Services', 5.00), ('Bronze', 'Subscriptions', 6.00)
) AS source(tier, category, max_discount)
WHERE NOT EXISTS (SELECT 1 FROM discount_tier_ceilings d WHERE d.tier = source.tier::customer_tier AND d.category = source.category::product_category);

INSERT INTO approval_chain_rules (min_over_limit_points, max_over_limit_points, requires_manager, requires_finance, risk_label)
SELECT source.min_points, source.max_points, source.requires_manager, source.requires_finance, source.risk_label
FROM (VALUES
  (0.01, 5.00, true, false, 'MEDIUM'),
  (5.01, NULL::numeric, true, true, 'HIGH')
) AS source(min_points, max_points, requires_manager, requires_finance, risk_label)
WHERE NOT EXISTS (SELECT 1 FROM approval_chain_rules r WHERE r.min_over_limit_points = source.min_points);

-- ===================== WAREHOUSES AND STOCK =====================
INSERT INTO warehouses (name, shipping_cost_weight, replenishment_rule)
SELECT source.name, source.shipping_weight, source.replenishment_rule
FROM (VALUES
  ('Main Warehouse', 1.00, 'Replenish when available stock drops below 20 units'),
  ('East Depot', 1.25, 'Replenish weekly from Main Warehouse')
) AS source(name, shipping_weight, replenishment_rule)
WHERE NOT EXISTS (SELECT 1 FROM warehouses w WHERE w.name = source.name);

INSERT INTO warehouse_stock (warehouse_id, product_id, in_stock, reserved)
SELECT w.id, p.id, source.in_stock, source.reserved
FROM (VALUES
  ('Main Warehouse', 'ProBook X1', 12, 0), ('East Depot', 'ProBook X1', 8, 0),
  ('Main Warehouse', 'SecureDock 4K', 30, 0), ('East Depot', 'SecureDock 4K', 10, 0),
  ('Main Warehouse', 'Extended Warranty', 100, 0)
) AS source(warehouse_name, product_name, in_stock, reserved)
JOIN warehouses w ON w.name = source.warehouse_name
JOIN products p ON p.name = source.product_name
WHERE NOT EXISTS (SELECT 1 FROM warehouse_stock s WHERE s.warehouse_id = w.id AND s.product_id = p.id);

-- ===================== SUBSCRIPTIONS AND UPSELLS =====================
INSERT INTO subscription_plans (name, product_id, cycle, price, proration_rule, cancellation_rule, partial_refund_percent)
SELECT source.name, p.id, source.cycle::billing_cycle, source.price, 'daily-prorate-on-qty-change', 'Cancel at next billing date', 50.00
FROM (VALUES ('Monthly Support Plan', 'Monthly Support', 'Monthly', 120.00)) AS source(name, product_name, cycle, price)
JOIN products p ON p.name = source.product_name
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans sp WHERE sp.name = source.name);

INSERT INTO upsell_rules (base_product_id, suggested_product_id, co_purchase_score, is_promoted, promo_label, min_margin_percent)
SELECT base.id, suggested.id, source.score, source.is_promoted, source.promo_label, source.min_margin
FROM (VALUES
  ('ProBook X1', 'Extended Warranty', 92.00, true, 'Recommended protection', 40.00),
  ('ProBook X1', 'SecureDock 4K', 78.00, false, 'Complete the workspace', 25.00),
  ('SecureDock 4K', 'Installation Service', 64.00, false, 'Fast deployment', 35.00)
) AS source(base_name, suggested_name, score, is_promoted, promo_label, min_margin)
JOIN products base ON base.name = source.base_name
JOIN products suggested ON suggested.name = source.suggested_name
WHERE NOT EXISTS (SELECT 1 FROM upsell_rules u WHERE u.base_product_id = base.id AND u.suggested_product_id = suggested.id);