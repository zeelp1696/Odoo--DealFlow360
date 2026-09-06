import React, { useState, useEffect } from 'react';
import { getProducts, getUsers } from '../api/catalogApi.js';
import { getCeilings } from '../api/discountsApi.js';
import { createQuotation, addLine, submitForApproval } from '../api/quotationsApi.js';
import { apiPost } from '../api/client.js';

export default function QuotationBuilder({ onClose, onSuccess }) {
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [ceilings, setCeilings] = useState([]);
  
  const [selectedUserId, setSelectedUserId] = useState('');
  const [cart, setCart] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([getUsers(), getProducts(), getCeilings()])
      .then(([userData, prodData, ceilData]) => {
        setUsers(userData || []);
        setProducts(prodData || []);
        setCeilings(ceilData || []);
      })
      .catch(err => setMessage(err.message));
  }, []);

  const selectedUser = users.find(u => String(u.id) === String(selectedUserId));

  // Group products by category
  const categories = [...new Set(products.map(p => p.category))];

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1, discountPercent: 0 }];
    });
  };

  const updateCartItem = (productId, field, value) => {
    setCart(prev => prev.map(item => item.product.id === productId ? { ...item, [field]: value } : item));
  };

  const removeCartItem = (productId) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const [recommendations, setRecommendations] = useState([]);
  
  useEffect(() => {
    const productIds = cart.map(item => item.product.id);
    if (productIds.length > 0) {
      apiPost('/upsell', { productIds })
        .then(data => setRecommendations(data.recommendations || []))
        .catch(err => console.error(err));
    } else {
      setRecommendations([]);
    }
  }, [cart]);

  const calculateLine = (item) => {
    const limit = ceilings.find(c => c.tier === (selectedUser?.tier || 'Bronze') && c.category === item.product.category)?.max_discount_percent || 0;
    const overLimit = Number(item.discountPercent) > Number(limit);
    const total = Number(item.product.base_price) * Number(item.quantity) * (1 - Number(item.discountPercent) / 100);
    return { limit, overLimit, total };
  };

  const cartTotal = cart.reduce((sum, item) => sum + calculateLine(item).total, 0);
  const anyOverLimit = cart.some(item => calculateLine(item).overLimit);

  const handleConfirm = async (saveAsDraft = false) => {
    if (!selectedUserId) {
      setMessage('Please select a user first.');
      return;
    }
    if (cart.length === 0) {
      setMessage('Please add at least one product to the quotation.');
      return;
    }

    setSaving(true);
    setMessage(saveAsDraft ? 'Saving draft...' : 'Creating quotation...');
    
    try {
      const quotation = await createQuotation(selectedUserId);
      
      setMessage('Adding lines...');
      for (const item of cart) {
        await addLine(quotation.id, {
          productId: item.product.id,
          quantity: item.quantity,
          discountPercent: item.discountPercent
        });
      }
      
      if (!saveAsDraft) {
        setMessage('Submitting for approval...');
        await submitForApproval(quotation.id);
      }
      
      setMessage(saveAsDraft ? 'Draft saved successfully!' : 'Quotation submitted successfully!');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        else if (onClose) onClose();
      }, 1000);
    } catch (err) {
      setMessage(err.message || 'An error occurred while saving.');
      setSaving(false);
    }
  };

  return (
    <div className="builder-modal-overlay">
      <div className="builder-modal">
        <header className="builder-header">
          <div>
            <span className="eyebrow">New Quotation</span>
            <h2>Quotation Builder</h2>
          </div>
          <button className="builder-close" onClick={onClose}>×</button>
        </header>
        
        <div className="builder-layout">
          {/* Left Column: Product Catalog */}
          <div className="builder-catalog">
            <h3>Product Catalog</h3>
            {categories.length === 0 ? (
              <div className="empty-catalog" style={{ textAlign: 'center', color: '#64736a', padding: '3rem', border: '1px dashed #cfdacf', borderRadius: '6px', marginTop: '1rem' }}>
                No products available in the catalog.
              </div>
            ) : (
              <div className="catalog-groups">
                {categories.map(category => (
                  <div key={category} className="catalog-group">
                    <h4>{category}</h4>
                    <div className="product-list">
                      {products.filter(p => p.category === category).map(product => (
                        <div key={product.id} className="product-item">
                          <div className="product-info">
                            <strong>{product.name}</strong>
                            <span>${Number(product.base_price).toLocaleString()}</span>
                          </div>
                          <button type="button" className="btn-outline btn-small" onClick={() => addToCart(product)}>+ Add</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {recommendations.length > 0 && (
              <div className="builder-recommendations" style={{ marginTop: '2rem', padding: '1.5rem', background: '#f6e8bd', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: '#8c681f' }}>Recommended for this deal</h4>
                <div className="product-list">
                  {recommendations.map(rec => (
                    <div key={rec.id} className="product-item" style={{ background: '#fff' }}>
                      <div className="product-info">
                        <strong>{rec.name} <span style={{fontSize: '0.65rem', background: '#e2b75b', color: '#17231f', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px'}}>{rec.promo_label}</span></strong>
                        <span>${Number(rec.base_price).toLocaleString()}</span>
                      </div>
                      <button type="button" className="btn-gold btn-small" onClick={() => addToCart({ id: rec.id, name: rec.name, base_price: rec.base_price, category: rec.category })}>+ Add</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Cart / Order Lines */}
          <div className="builder-cart">
            <div className="cart-header">
              <label>
                <strong>Customer</strong>
                <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} required>
                  <option value="">Choose user...</option>
                  {users.filter(u => u.role === 'customer').map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.tier ? `- ${u.tier}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="cart-lines">
              {cart.length === 0 ? (
                <div className="empty-cart">No products added yet.</div>
              ) : (
                cart.map(item => {
                  const line = calculateLine(item);
                  return (
                    <div key={item.product.id} className="cart-line-item">
                      <div className="line-header">
                        <strong>{item.product.name}</strong>
                        <button type="button" className="btn-remove" onClick={() => removeCartItem(item.product.id)}>×</button>
                      </div>
                      <div className="line-controls">
                        <label>
                          Qty
                          <input type="number" min="1" value={item.quantity} onChange={e => updateCartItem(item.product.id, 'quantity', e.target.value)} />
                        </label>
                        <label>
                          Disc %
                          <input type="number" min="0" max="100" step="0.01" value={item.discountPercent} onChange={e => updateCartItem(item.product.id, 'discountPercent', e.target.value)} />
                        </label>
                        <div className="line-total">
                          <span>${line.total.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                      <div className={`line-risk ${line.overLimit ? 'risk-over' : 'risk-ok'}`}>
                        {selectedCustomer ? (
                          line.overLimit ? `Warning: Exceeds ${line.limit}% tier limit (Requires Approval)` : `Within ${line.limit}% tier limit`
                        ) : 'Select a customer to see limits'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="cart-footer">
              <div className="cart-totals">
                <span>Order Total:</span>
                <h2>${cartTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
              </div>
              
              {message && <div className="builder-message">{message}</div>}
              
              <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                <button 
                  className="btn-outline builder-confirm" 
                  style={{ flex: 1 }}
                  onClick={() => handleConfirm(true)} 
                  disabled={cart.length === 0 || !selectedCustomerId || saving}
                >
                  {saving ? 'Saving...' : 'Save as Draft'}
                </button>
                <button 
                  className="btn-gold builder-confirm" 
                  style={{ flex: 1 }}
                  onClick={() => handleConfirm(false)} 
                  disabled={cart.length === 0 || !selectedCustomerId || saving}
                >
                  {saving ? 'Processing...' : (anyOverLimit ? 'Submit for Approval ↗' : 'Confirm Quotation ↗')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
