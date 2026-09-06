import React from 'react';

export default function ProductDetails({ product, onBack }) {
  if (!product) return null;

  // Mocked variants data based on the mockup
  const variants = [
    { attribute: 'Color', values: 'Blue, Black', extraPrice: '0' },
    { attribute: 'RAM', values: '4GB, 8GB', extraPrice: '+$30' },
    { attribute: 'Manufacturer', values: 'Dell, HP', extraPrice: '+$10/+$30' }
  ];

  // Mocked pricelists data
  const pricelists = [
    { tier: 'Bronze', currency: 'USD', priceRule: 'Price, no adjustment' },
    { tier: 'Gold', currency: 'USD/EUR', priceRule: 'Price minus 10 percent base' }
  ];

  return (
    <section className="mockup-page-container">
      <div className="mockup-actions" style={{ marginBottom: '1rem' }}>
        <button className="ghost" onClick={onBack}>&larr; Back to Catalog</button>
      </div>

      <div className="mockup-title">Product and pricelist</div>
      
      <div className="mockup-subtitle" style={{color: '#666', marginTop: '1rem', marginBottom: '0.5rem'}}>General Info</div>
      
      <div className="mockup-details-section">
        <div className="mockup-details-grid">
          <div>
            <div className="mockup-field-row">
              <label>Product name</label>
              <input type="text" readOnly value={product.name} />
            </div>
            <div className="mockup-field-row">
              <label>Category</label>
              <input type="text" readOnly value={product.category} />
            </div>
            <div className="mockup-field-row">
              <label>Price</label>
              <input type="text" readOnly value={product.base_price} />
            </div>
            <div className="mockup-field-row">
              <label>Unit</label>
              <input type="text" readOnly value={product.unit} />
            </div>
            <div className="mockup-field-row">
              <label>Description</label>
              <input type="text" readOnly value={product.description || ''} />
            </div>
          </div>
          <div>
            <div className="mockup-field-row">
              <label>Subscription</label>
              <input type="text" readOnly value={product.category === 'Subscriptions' ? 'Yes' : 'No'} />
            </div>
            
            <div className="mockup-field-row">
              <label>Margin %</label>
              <input type="text" readOnly value={product.margin_percent || '0'} />
            </div>
            <div className="mockup-field-row">
              <label>Tax %</label>
              <input type="text" readOnly value={product.tax_percent || '0'} />
            </div>

            <div className="mockup-field-row" style={{ alignItems: 'flex-start' }}>
              <label style={{ marginTop: '0.6rem' }}>Warehouses & Stock</label>
              <div style={{ flex: 1, background: '#f8fafc', padding: '0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0', minHeight: '40px' }}>
                {product.stock_levels && product.stock_levels.length > 0 ? (
                  product.stock_levels.map((wh, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: idx === product.stock_levels.length - 1 ? 0 : '0.25rem' }}>
                      <span>{wh.warehouse_name}</span>
                      <span style={{ fontWeight: '500' }}>{wh.in_stock}</span>
                    </div>
                  ))
                ) : (
                  <span style={{ color: '#64748b', fontSize: '0.9rem' }}>No stock data</span>
                )}
              </div>
            </div>

            {product.category === 'Subscriptions' && (
              <div className="mockup-field-row">
                <label>Billing Cycle</label>
                <input type="text" readOnly value="Monthly" />
              </div>
            )}

          </div>
        </div>
      </div>

      <div className="mockup-subtitle" style={{color: '#666', marginBottom: '0.5rem'}}>Pricelists</div>
      <table className="mockup-table">
        <thead>
          <tr>
            <th>Tier</th>
            <th>Currency</th>
            <th>Price Rule</th>
          </tr>
        </thead>
        <tbody>
          {pricelists.map((p, i) => (
            <tr key={i}>
              <td>{p.tier}</td>
              <td>{p.currency}</td>
              <td>{p.priceRule}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mockup-alert-yellow">
        Product details should be filled.<br />
        Recurring order with this product will be invoiced at the beginning of the period.
      </div>
    </section>
  );
}
