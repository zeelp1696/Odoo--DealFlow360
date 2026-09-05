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
              <label>Tax %</label>
              <input type="text" readOnly value={product.tax_percent || '0'} />
            </div>
            <div className="mockup-field-row">
              <label>Subscription</label>
              <input type="text" readOnly value={product.category === 'Subscriptions' ? 'Yes' : 'No'} />
            </div>
            {product.category === 'Subscriptions' && (
              <div className="mockup-field-row">
                <label>Recurring</label>
                <select readOnly value="Monthly" disabled>
                  <option>Monthly</option>
                  <option>Yearly</option>
                  <option>Weekly</option>
                </select>
                <span className="mockup-field-hint">If subscription yes then recurring will be visible</span>
              </div>
            )}
            <div className="mockup-field-row">
              <label>Quantity on hand</label>
              <input type="text" readOnly value="150" />
              <span className="mockup-field-hint">(Integer field)</span>
            </div>
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
