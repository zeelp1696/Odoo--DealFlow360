import React, { useState, useEffect } from 'react';
import { getFulfillmentData } from '../api/fulfillmentApi.js';
import FulfillmentDetail from './FulfillmentDetail.jsx';

export default function FulfillmentPage() {
  const [data, setData] = useState({ stock: [], orders: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFulfillmentId, setActiveFulfillmentId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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
                  <td style={{ padding: '1rem', color: '#334155' }}>{s.in_stock}</td>
                  <td style={{ padding: '1rem', color: '#334155' }}>{s.reserved}</td>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: s.available > 0 ? '#16a34a' : '#dc2626' }}>{s.available}</td>
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
