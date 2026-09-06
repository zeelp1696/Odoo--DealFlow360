import React, { useState, useEffect } from 'react';
import { getFulfillmentDetail, updateFulfillment } from '../api/fulfillmentApi.js';

export default function FulfillmentDetail({ fulfillmentId, onClose, onSuccess }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [manualSplits, setManualSplits] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const details = await getFulfillmentDetail(fulfillmentId);
        setData(details);
        // Initialize manual splits state
        setManualSplits(details.splits.map(s => ({ id: s.id, qty: s.qty_fulfilled })));
      } catch (err) {
        setError(err.message || 'Failed to load fulfillment details');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [fulfillmentId]);

  const handleAction = async (action) => {
    setIsSubmitting(true);
    setError('');
    try {
      await updateFulfillment(fulfillmentId, action, isManualOverride ? manualSplits : null);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || `Failed to process ${action}`);
      setIsSubmitting(false);
    }
  };

  const handleQtyChange = (splitId, newQty) => {
    setManualSplits(prev => prev.map(s => s.id === splitId ? { ...s, qty: Number(newQty) } : s));
  };

  if (loading) return <div className="builder-modal-overlay"><div className="builder-modal">Loading...</div></div>;
  if (!data || !data.order) return <div className="builder-modal-overlay"><div className="builder-modal">Not found <button onClick={onClose}>Close</button></div></div>;

  const { order, splits } = data;
  
  // Check if any split has backorder
  const hasBackorder = splits.some(s => s.backorder_qty > 0);

  return (
    <div className="builder-modal-overlay">
      <div className="builder-modal" style={{ maxWidth: '900px', width: '95%', position: 'relative', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)' }}>
        
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b', zIndex: 10 }}
        >
          &times;
        </button>

        <header className="modal-header" style={{ padding: '2rem 2rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: '#fff', flexShrink: 0 }}>
          <h2 style={{ fontSize: '1.6rem', margin: '0 0 0.5rem 0', color: '#0f172a' }}>
            Fulfillment Detail: {order.quotation_code} ({order.customer_name})
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
            Opened by clicking an order row on the Fulfillment list
          </p>
        </header>

        {error && <div className="error-message" style={{ margin: '1rem 2rem', flexShrink: 0 }}>{error}</div>}

        <div className="builder-split" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '2rem', background: '#f8fafc', flex: 1, overflowY: 'auto' }}>
          
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.85rem' }}>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0' }}>Warehouse</th>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0' }}>Qty Fulfilled</th>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0' }}>Est. Shipments</th>
                  <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0' }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {splits.map((split, i) => {
                  const manualSplit = manualSplits.find(s => s.id === split.id);
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1rem', fontWeight: '500' }}>{split.warehouse_name}</td>
                      <td style={{ padding: '1rem' }}>
                        {isManualOverride ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input 
                              type="number" 
                              value={manualSplit?.qty || 0} 
                              onChange={(e) => handleQtyChange(split.id, e.target.value)}
                              style={{ width: '80px', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                              min="0"
                            />
                            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>units</span>
                          </div>
                        ) : (
                          `${split.qty_fulfilled} units`
                        )}
                      </td>
                      <td style={{ padding: '1rem', color: '#334155' }}>{split.estimated_shipments}</td>
                      <td style={{ padding: '1rem', color: '#334155' }}>${Number(split.estimated_cost).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {(hasBackorder || true) && (
            <div style={{ background: '#fef9c3', border: '1px solid #fde047', padding: '1rem', borderRadius: '8px', color: '#854d0e', fontSize: '0.9rem' }}>
              "Consolidate Remaining Backorder" prompt appears automatically once East Depot restocks.
            </div>
          )}
          
        </div>

        {/* Footer Actions */}
        <div className="portal-actions" style={{ padding: '1.5rem 2rem', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', gap: '1rem', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', flexShrink: 0 }}>
          
          {isManualOverride ? (
             <button 
               onClick={() => handleAction('manual_override')} 
               disabled={isSubmitting}
               style={{ background: '#3b82f6', color: 'white', padding: '0.6rem 1.5rem', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', opacity: isSubmitting ? 0.5 : 1 }}
             >
               Save Manual Split
             </button>
          ) : (
             <button 
               onClick={() => handleAction('accept_suggested')} 
               disabled={isSubmitting}
               style={{ background: '#1d4ed8', color: 'white', padding: '0.6rem 1.5rem', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', opacity: isSubmitting ? 0.5 : 1 }}
             >
               Accept Suggested Split
             </button>
          )}

          <button 
            onClick={() => setIsManualOverride(!isManualOverride)} 
            disabled={isSubmitting}
            style={{ background: isManualOverride ? '#e2e8f0' : '#fff', color: '#0f172a', padding: '0.6rem 1.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', opacity: isSubmitting ? 0.5 : 1 }}
          >
            {isManualOverride ? 'Cancel Override' : 'Manual Override'}
          </button>
          
        </div>
      </div>
    </div>
  );
}
