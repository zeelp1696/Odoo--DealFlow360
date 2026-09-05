export const navigationByRole = {
  admin: [
    ['overview', 'Dashboard'], ['catalog', 'Products & pricing'], ['governance', 'Discount & approval'],
    ['inventory', 'Warehouses & stock'], ['subscriptions', 'Subscription plans'], ['upsell', 'Upsell rules'],
    ['reports', 'Reports'], ['administration', 'Users & roles'],
  ],
  sales_rep: [
    ['overview', 'Dashboard'], ['quotations', 'Quotations'], ['catalog', 'Customers & products'],
    ['upsell', 'Recommendations'], ['approvals', 'My approval requests'], ['fulfillment', 'Fulfillment'],
    ['billing', 'Billing & payments'], ['negotiation', 'Customer requests'],
  ],
  sales_manager: [
    ['overview', 'Dashboard'], ['approvals', 'Approval queue'], ['quotations', 'Team quotations'],
    ['governance', 'Discount rules'], ['fulfillment', 'Order monitoring'], ['deal-health', 'Deal health'], ['reports', 'Reports'],
  ],
  finance: [
    ['overview', 'Dashboard'], ['approvals', 'High-risk approvals'], ['fulfillment', 'Warehouse fulfillment'],
    ['billing', 'Invoices & payments'], ['subscriptions', 'Subscriptions'], ['deal-health', 'Alerts'], ['reports', 'Reports'],
  ],
  customer: [
    ['overview', 'Dashboard'], ['quotations', 'My quotations'], ['negotiation', 'Negotiation'],
    ['orders', 'My orders'], ['billing', 'Invoices & payments'], ['support', 'Questions & requests'],
  ],
};

export const moduleDescriptions = {
  catalog: 'Products, variants, customers, tiers, and price lists.',
  governance: 'Discount ceilings, approval chains, and audit history.',
  quotations: 'Create and track governed customer quotations.',
  approvals: 'Review risk, approve, reject, or return quotations.',
  fulfillment: 'Warehouse allocation, shipment splits, and backorders.',
  subscriptions: 'Plans, billing cycles, proration, and cancellations.',
  billing: 'Invoices, recurring billing, payments, refunds, and credits.',
  negotiation: 'Customer questions, requests, counter-discounts, and confirmation.',
  upsell: 'Recommendations, cross-sell rules, and promotions.',
  'deal-health': 'Stalled deals, discount anomalies, and delivery alerts.',
  reports: 'Sales, approval, product, billing, and fulfillment reporting.',
  administration: 'Users, roles, system configuration, and access control.',
  inventory: 'Warehouses, stock levels, replenishment, and allocation.',
  orders: 'Confirmed orders and delivery status.',
  support: 'Customer questions and change requests.',
};