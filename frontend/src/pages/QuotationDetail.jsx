import React, { useState, useEffect } from 'react';
import { getQuotation, updateLine, deleteLine, submitForApproval, addLine } from '../api/quotationsApi.js';
import { getUpsells } from '../api/modulesApi.js';
import { getProducts } from '../api/catalogApi.js';

export default function QuotationDetail({ quotationId, onClose, onSuccess }) {
  const [quotation, setQuotation] = useState(null);
  const [lines, setLines] = useState([]);
  const [upsells, setUpsells] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [qData, upData, pData] = await Promise.all([
          getQuotation(quotationId),
          getUpsells(),
          getProducts()
        ]);
        setQuotation(qData.quotation);
        setLines(qData.lines);
        setUpsells(upData.rows || []);
        setProducts(pData || []);
      } catch (err) {
        setMessage(err.message || 'Failed to load quotation');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [quotationId]);

  const handleUpdateLine = async (lineId, updates) => {
    try {
      await updateLine(quotationId, lineId, updates);
      // Reload lines
      const qData = await getQuotation(quotationId);
      setLines(qData.lines);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteLine = async (lineId) => {
    if (!window.confirm('Delete this line?')) return;
    try {
      await deleteLine(quotationId, lineId);
      const qData = await getQuotation(quotationId);
      setLines(qData.lines);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddUpsell = async (productId) => {
    try {
      await addLine(quotationId, { productId, quantity: 1, discountPercent: 0 });
      const qData = await getQuotation(quotationId);
      setLines(qData.lines);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setMessage('');
    try {
      await submitForApproval(quotationId);
      if (onSuccess) onSuccess();
    } catch (error) {
      setMessage(error.message || 'Submission failed');
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="builder-modal-overlay"><div className="builder-modal">Loading...</div></div>;
  if (!quotation) return <div className="builder-modal-overlay"><div className="builder-modal">Not found <button onClick={onClose}>Close</button></div></div>;

  return (
    <div className="builder-modal-overlay">
      <div className="builder-modal" style={{ maxWidth: '900px', width: '100%', position: 'relative', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)' }}>
        
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b', zIndex: 10 }}
          aria-label="Close modal"
        >
          &times;
        </button>

        <header className="modal-header" style={{ padding: '2rem 2rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: '#fff', flexShrink: 0 }}>
          <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem 0', color: '#0f172a' }}>
            Quotation Detail: {quotation.code}
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
            Opened by clicking a row on the Quotations list. Add products, apply discounts, review upsells.
          </p>
        </header>

        {message && <div className="error-message" style={{ margin: '1rem 2rem', flexShrink: 0 }}>{message}</div>}

        <div className="builder-split" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '2rem', background: '#f8fafc', flex: 1, overflowY: 'auto' }}>
          
          <div className="detail-info-row" style={{ display: 'flex', gap: '2rem' }}>
            <div className="form-group" style={{ flex: 1, margin: 0 }}>
              <label style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.5rem', display: 'block', fontWeight: '600' }}>Customer</label>
              <input type="text" value={quotation.customer_name || quotation.customer_id} disabled style={{ background: '#e2e8f0', border: '1px solid #cbd5e1', width: '100%', padding: '0.75rem', borderRadius: '6px', color: '#334155' }} />
            </div>
            <div className="form-group" style={{ flex: 1, margin: 0 }}>
              <label style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.5rem', display: 'block', fontWeight: '600' }}>Price List</label>
              <input type="text" value={quotation.price_list_id || 'Standard'} disabled style={{ background: '#e2e8f0', border: '1px solid #cbd5e1', width: '100%', padding: '0.75rem', borderRadius: '6px', color: '#334155' }} />
            </div>
          </div>

          <div className="alert-banner" style={{ background: '#fffbeb', borderLeft: '4px solid #fbbf24', padding: '1rem', color: '#92400e', borderRadius: '0 6px 6px 0', fontSize: '0.9rem' }}>
            <strong>Note:</strong> Discount is checked against each line's own limit live, as soon as it is entered, not only at submit time.
          </div>

          <div className="lines-section">
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem 0', color: '#1e293b' }}>Products</h3>
            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table className="detail-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>Product</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>Qty</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>Price</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>Discount %</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>Limit %</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.95rem' }}>
                  {lines.map(line => (
                    <tr key={line.id} style={{ borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
                      <td style={{ padding: '1rem', fontWeight: '500', color: '#0f172a' }}>{line.product_name}</td>
                      <td style={{ padding: '1rem' }}>
                        <input 
                          type="number" 
                          value={line.quantity} 
                          onChange={e => handleUpdateLine(line.id, { quantity: e.target.value })} 
                          style={{ width: '70px', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} 
                          min="1"
                        />
                      </td>
                      <td style={{ padding: '1rem', color: '#475569' }}>${Number(line.unit_price).toFixed(2)}</td>
                      <td style={{ padding: '1rem' }}>
                        <input 
                          type="number" 
                          value={line.discount_percent} 
                          onChange={e => handleUpdateLine(line.id, { discountPercent: e.target.value })} 
                          style={{ width: '70px', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} 
                          min="0" max="100"
                        />
                      </td>
                      <td style={{ padding: '1rem', color: '#475569' }}>{line.allowed_limit_percent}%</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ 
                          padding: '0.25rem 0.6rem', 
                          borderRadius: '9999px', 
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: line.line_status === 'OVER' ? '#fee2e2' : '#dcfce7',
                          color: line.line_status === 'OVER' ? '#991b1b' : '#166534'
                        }}>
                          {line.line_status === 'OVER' ? `OVER (+${line.over_limit_points}pt)` : 'OK'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <button onClick={() => handleDeleteLine(line.id)} style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '0.85rem' }}>Remove</button>
                      </td>
                    </tr>
                  ))}
                  {lines.length === 0 && (
                    <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No products added yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="upsell-section">
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem 0', color: '#1e293b' }}>Upsell and Cross-Sell Suggestions</h3>
            <div className="upsell-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
              {upsells.slice(0, 4).map((u, i) => {
                const product = products.find(p => p.name === u.recommendation);
                return (
                  <div key={i} className="upsell-card" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: u.is_promoted ? '#f0f9ff' : '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontWeight: '600', color: '#0f172a' }}>+ {u.recommendation}</div>
                    <div style={{ fontSize: '0.8rem', color: u.is_promoted ? '#0369a1' : '#64748b', fontWeight: '500' }}>
                      {u.is_promoted ? `Promo: ${u.promo_label}` : `Margin Score: ${u.co_purchase_score}`}
                    </div>
                    {product && (
                      <button 
                        onClick={() => handleAddUpsell(product.id)}
                        style={{ marginTop: 'auto', padding: '0.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500', transition: 'background 0.2s' }}
                      >
                        Add to Quote
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="portal-actions" style={{ padding: '1.5rem 2rem', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', flexShrink: 0 }}>
          <button className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Save Draft
          </button>
          <button className="btn-primary" onClick={handleSubmit} disabled={isSubmitting || lines.length === 0}>
            Submit for Approval
          </button>
        </div>
      </div>
    </div>
  );
}
