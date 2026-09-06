import React, { useState, useEffect } from 'react';
import { apiGet } from '../api/client.js';

export default function DealHealth() {
  const [data, setData] = useState({ stalled: [], flags: [], config: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet('/deal-health')
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ padding: '2rem' }}>Loading deal health...</div>;
  if (error) return <div className="error" style={{ margin: '2rem' }}>{error}</div>;

  return (
    <section className="mockup-page-container">
      <div className="mockup-title">Deal Health & Anomalies</div>
      <div className="mockup-subtitle">Track stalled negotiations, discount spikes, and delivery slippages.</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginTop: '2rem' }}>
        <div className="dashboard-card" style={{ borderLeft: '4px solid #e2b75b' }}>
          <h4>Stalled Threshold</h4>
          <p>{data.config.stalled_deal_days} Days Inactive</p>
        </div>
        <div className="dashboard-card" style={{ borderLeft: '4px solid #16443a' }}>
          <h4>Anomaly Trigger</h4>
          <p>{data.config.anomaly_multiplier}x Historical Avg</p>
        </div>
        <div className="dashboard-card" style={{ borderLeft: '4px solid #8c681f' }}>
          <h4>Delivery Slippage</h4>
          <p>{data.config.delivery_slippage_days} Days Overdue</p>
        </div>
      </div>

      <div className="mockup-card" style={{ marginTop: '3rem' }}>
        <h3>Stalled Deals</h3>
        {data.stalled.length === 0 ? (
          <p style={{ color: '#64736a' }}>No stalled deals right now.</p>
        ) : (
          <table className="mockup-table">
            <thead>
              <tr>
                <th>Quotation</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {data.stalled.map(deal => (
                <tr key={deal.id}>
                  <td><strong>{deal.code}</strong></td>
                  <td>{deal.customer_name}</td>
                  <td><span className="status-badge" style={{ background: '#f6e8bd', color: '#8c681f' }}>{deal.status}</span></td>
                  <td>{new Date(deal.last_activity_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mockup-card" style={{ marginTop: '2rem' }}>
        <h3>Active Flags & Anomalies</h3>
        {data.flags.length === 0 ? (
          <p style={{ color: '#64736a' }}>No active deal flags.</p>
        ) : (
          <table className="mockup-table">
            <thead>
              <tr>
                <th>Quotation</th>
                <th>Customer</th>
                <th>Flag Type</th>
                <th>Details</th>
                <th>Date Flagged</th>
              </tr>
            </thead>
            <tbody>
              {data.flags.map(flag => (
                <tr key={flag.id}>
                  <td><strong>{flag.quotation_code}</strong></td>
                  <td>{flag.customer_name}</td>
                  <td><span style={{ color: '#d93025', fontWeight: 'bold' }}>{flag.flag_type}</span></td>
                  <td>{flag.detail}</td>
                  <td>{new Date(flag.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
