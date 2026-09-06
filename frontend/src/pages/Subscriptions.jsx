import React, { useState, useEffect } from 'react';
import { apiGet } from '../api/client.js';

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet('/billing/subscriptions')
      .then(data => {
        setSubscriptions(data.subscriptions || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ padding: '2rem' }}>Loading subscriptions...</div>;
  if (error) return <div className="error" style={{ margin: '2rem' }}>{error}</div>;

  return (
    <section className="mockup-page-container">
      <div className="mockup-title">Active Subscriptions</div>
      <div className="mockup-subtitle">Manage customer recurring plans and upcoming renewals.</div>

      {subscriptions.length === 0 ? (
        <div style={{ marginTop: '3rem', color: '#64736a' }}>No active subscriptions found.</div>
      ) : (
        <table className="mockup-table" style={{ marginTop: '2rem' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Plan</th>
              <th>Cycle</th>
              <th>Qty</th>
              <th>Next Bill Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map(sub => (
              <tr key={sub.id}>
                <td>SUB-{sub.id.toString().padStart(4, '0')}</td>
                <td>{sub.customer_name}</td>
                <td><strong>{sub.plan_name}</strong></td>
                <td style={{ textTransform: 'capitalize' }}>{sub.cycle}</td>
                <td>{sub.quantity}</td>
                <td>{new Date(sub.next_bill_date).toLocaleDateString()}</td>
                <td>
                  <span className={`status-badge status-${sub.status.toLowerCase()}`}>
                    {sub.status}
                  </span>
                </td>
                <td>
                  {sub.status === 'Active' && (
                    <button type="button" className="btn-outline btn-small" onClick={() => alert('Pause subscription functionality would go here.')}>Pause</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
