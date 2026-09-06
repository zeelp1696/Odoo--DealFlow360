const standardInternal = [
  ['overview', 'Dashboard'],
  ['quotations', 'Quotations'],
  ['approvals', 'Approvals'],
  ['fulfillment', 'Fulfillment'],
  ['subscriptions', 'Subscriptions'],
  ['billing', 'Invoices'],
  ['deal-health', 'Deal Health'],
  ['reports', 'Reports']
];

export const navigationByRole = {
  admin: [...standardInternal, ['catalog', 'Product Catalog'], ['governance', 'Discount Rules'], ['administration', 'Administration']],
  sales_rep: standardInternal,
  sales_manager: standardInternal,
  finance: standardInternal,
  customer: [
    ['overview', 'Dashboard'], 
    ['customer-portal', 'My Quotation / Messages / Profile']
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