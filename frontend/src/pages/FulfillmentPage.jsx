import React, { useState, useEffect } from 'react';
import { getFulfillmentData, updateStock } from '../api/fulfillmentApi.js';
import FulfillmentDetail from './FulfillmentDetail.jsx';

export default function FulfillmentPage({ user }) {
  const [data, setData] = useState({ stock: [], orders: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFulfillmentId, setActiveFulfillmentId] = useState(null);
  const [editingStock, setEditingStock] = useState(null);
  const [editForm, setEditForm] = useState({ in_stock: 0, reserved: 0 });

  const handleSaveStock = async (id) => {
    try {
      await updateStock(id, editForm.in_stock, editForm.reserved);
      setEditingStock(null);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to update stock');
    }
  };

  const isAuthorized = ['admin', 'finance'].includes(user?.role);

  const fetchData = async () => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await getFulfillmentData();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to fetch fulfillment data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAuthorized]);

  return (
    <section className="fulfillment-page" style={{ padding: '2rem' }}>
      <div className="section-heading" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', margin: 0, color: '#0f172a' }}>Fulfillment and Stock (List)</h2>
        <span style={{ color: '#64748b', fontSize: '1rem' }}>
          Live stock per warehouse, plus every order that still needs fulfilling
        </span>
      </div>

      {error && <div className="error-message" style={{ color: '#dc2626', marginBottom: '1rem' }}>{error}</div>}

      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '2.5rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>Warehouse</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>Product</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>In Stock</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>Reserved</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>Available</th>
              {user?.role !== 'sales_rep' && (
                <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', width: '100px' }}>Actions</th>
              )}
            </tr>
          </thead>
          <tbody style={{ fontSize: '0.95rem' }}>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Loading...</td></tr>
            ) : data.stock.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No stock data found.</td></tr>
            ) : (
              data.stock.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '1rem', fontWeight: '500', color: '#0f172a' }}>{s.warehouse_name}</td>
                  <td style={{ padding: '1rem', color: '#334155' }}>{s.product_name}</td>
                  <td style={{ padding: '1rem', color: '#334155' }}>
                    {editingStock === s.id ? (
                      <input type="number" value={editForm.in_stock} onChange={e => setEditForm({ ...editForm, in_stock: Number(e.target.value) })} style={{ width: '80px', padding: '0.25rem' }} />
                    ) : (
                      s.in_stock
                    )}
                  </td>
                  <td style={{ padding: '1rem', color: '#334155' }}>
                    {editingStock === s.id ? (
                      <input type="number" value={editForm.reserved} onChange={e => setEditForm({ ...editForm, reserved: Number(e.target.value) })} style={{ width: '80px', padding: '0.25rem' }} />
                    ) : (
                      s.reserved
                    )}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: s.available > 0 ? '#16a34a' : '#dc2626' }}>
                    {editingStock === s.id ? editForm.in_stock - editForm.reserved : s.available}
                  </td>
                  {user?.role !== 'sales_rep' && (
                    <td style={{ padding: '1rem' }}>
                      {editingStock === s.id ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => handleSaveStock(s.id)} style={{ padding: '0.25rem 0.5rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Save</button>
                          <button onClick={() => setEditingStock(null)} style={{ padding: '0.25rem 0.5rem', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingStock(s.id); setEditForm({ in_stock: s.in_stock, reserved: s.reserved }); }} style={{ padding: '0.25rem 0.5rem', background: 'transparent', color: '#3b82f6', border: '1px solid #3b82f6', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Edit</button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h3 style={{ fontSize: '1.25rem', color: '#3b82f6', marginBottom: '1rem', fontWeight: '500' }}>Orders Awaiting Fulfillment</h3>
      
      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '1.5rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>Order</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>Customer</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>Status</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>Warehouses</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: '0.95rem' }}>
            {loading ? (
              <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Loading...</td></tr>
            ) : data.orders.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No pending orders.</td></tr>
            ) : (
              data.orders.map(o => (
                <tr 
                  key={o.id} 
                  style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  onClick={() => setActiveFulfillmentId(o.id)}
                >
                  <td style={{ padding: '1rem', fontWeight: '500', color: '#0f172a' }}>{o.quotation_code}</td>
                  <td style={{ padding: '1rem', color: '#334155' }}>{o.customer_name}</td>
                  <td style={{ padding: '1rem', color: '#334155' }}>{o.status}</td>
                  <td style={{ padding: '1rem', color: '#334155' }}>{o.warehouses || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ background: '#fef9c3', border: '1px solid #fde047', color: '#854d0e', padding: '1rem', borderRadius: '6px', fontSize: '0.9rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        Click an order row to open its warehouse split detail.
      </div>

      {activeFulfillmentId && (
        <FulfillmentDetail 
          fulfillmentId={activeFulfillmentId} 
          user={user}
          onClose={() => setActiveFulfillmentId(null)} 
          onSuccess={() => {
            setActiveFulfillmentId(null);
            fetchData();
          }} 
        />
      )}
    </section>
  );
}
