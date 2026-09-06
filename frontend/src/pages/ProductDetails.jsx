import React, { useState } from 'react';

export default function ProductDetails({ user, product, onBack, onUpdated }) {
  if (!product) return null;

  const isAdmin = user && user.role === 'admin';
  const [editedProduct, setEditedProduct] = useState({
    name: product.name,
    category: product.category,
    base_price: product.base_price,
    unit: product.unit,
    description: product.description || '',
    margin_percent: product.margin_percent || '0',
    tax_percent: product.tax_percent || '0'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (field, value) => {
    if (!isAdmin) return;
    setEditedProduct(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');
    try {
      const session = localStorage.getItem('dealflow-session');
      const token = session ? JSON.parse(session).token : '';
      
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:4000/api"}/catalog/products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editedProduct)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update product');
      
      setMessage('Changes saved successfully!');
      if (onUpdated) onUpdated();
    } catch (err) {
      setMessage(err.message);
    }
    setIsSaving(false);
  };

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
      <div className="mockup-actions" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="ghost" onClick={onBack}>&larr; Back to Catalog</button>
        {isAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {message && <span style={{ color: message.includes('Failed') ? '#ef4444' : '#10b981', fontSize: '0.9rem' }}>{message}</span>}
            <button className="btn-gold" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      <div className="mockup-title">Product and pricelist</div>
      
      <div className="mockup-subtitle" style={{color: '#666', marginTop: '1rem', marginBottom: '0.5rem'}}>General Info</div>
      
      <div className="mockup-details-section">
        <div className="mockup-details-grid">
          <div>
            <div className="mockup-field-row">
              <label>Product name</label>
              <input type="text" readOnly={!isAdmin} value={editedProduct.name} onChange={e => handleChange('name', e.target.value)} />
            </div>
            <div className="mockup-field-row">
              <label>Category</label>
              <input type="text" readOnly={!isAdmin} value={editedProduct.category} onChange={e => handleChange('category', e.target.value)} />
            </div>
            <div className="mockup-field-row">
              <label>Price</label>
              <input type="number" readOnly={!isAdmin} value={editedProduct.base_price} onChange={e => handleChange('base_price', e.target.value)} />
            </div>
            <div className="mockup-field-row">
              <label>Unit</label>
              <input type="text" readOnly={!isAdmin} value={editedProduct.unit} onChange={e => handleChange('unit', e.target.value)} />
            </div>
            <div className="mockup-field-row">
              <label>Description</label>
              <input type="text" readOnly={!isAdmin} value={editedProduct.description} onChange={e => handleChange('description', e.target.value)} />
            </div>
          </div>
          <div>
            <div className="mockup-field-row">
              <label>Subscription</label>
              <input type="text" readOnly value={editedProduct.category === 'Subscriptions' ? 'Yes' : 'No'} />
            </div>
            
            <div className="mockup-field-row">
              <label>Margin %</label>
              <input type="number" readOnly={!isAdmin} value={editedProduct.margin_percent} onChange={e => handleChange('margin_percent', e.target.value)} />
            </div>
            <div className="mockup-field-row">
              <label>Tax %</label>
              <input type="number" readOnly={!isAdmin} value={editedProduct.tax_percent} onChange={e => handleChange('tax_percent', e.target.value)} />
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
