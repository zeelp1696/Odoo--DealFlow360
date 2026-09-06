import React, { useState, useEffect } from 'react';
import { getSubscriptions } from '../api/subscriptionsApi.js';
import SubscriptionDetail from './SubscriptionDetail.jsx';
import NewPlanModal from './NewPlanModal.jsx';

export default function SubscriptionsPage({ user }) {
  const [data, setData] = useState({ subscriptions: [], counts: { active: 0, paused: 0, cancelled: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [activeSubId, setActiveSubId] = useState(null);
  const [showNewPlan, setShowNewPlan] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getSubscriptions();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to fetch subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const filtered = filterStatus === 'All'
    ? data.subscriptions
    : data.subscriptions.filter(s => s.status === filterStatus);

  const statusColors = {
    Active: { bg: '#16a34a', light: '#dcfce7', text: '#15803d', border: '#16a34a' },
    Paused:  { bg: '#f59e0b', light: '#fef3c7', text: '#b45309', border: '#f59e0b' },
    Cancelled: { bg: '#ef4444', light: '#fee2e2', text: '#b91c1c', border: '#ef4444' },
  };

  const btnStyle = (status) => {
    const c = statusColors[status];
    const active = filterStatus === status;
    return {
      background: active ? c.bg : c.light,
      color: active ? '#fff' : c.text,
      border: `2px solid ${c.border}`,
      padding: '0.4rem 1rem',
      borderRadius: '6px',
      fontWeight: '700',
      cursor: 'pointer',
      fontSize: '0.9rem',
      transition: 'all 0.15s',
    };
  };

  return (
    <section style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0', color: '#0f172a' }}>Subscriptions (List)</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>
          Every recurring plan across every customer, regardless of which order it came from
        </p>
      </div>

      {error && <div style={{ color: '#dc2626', marginBottom: '1rem' }}>{error}</div>}

      {/* Status Counters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button style={btnStyle('Active')} onClick={() => setFilterStatus(filterStatus === 'Active' ? 'All' : 'Active')}>
          {data.counts.active} Active
        </button>
        <button style={btnStyle('Paused')} onClick={() => setFilterStatus(filterStatus === 'Paused' ? 'All' : 'Paused')}>
          {data.counts.paused} Paused
        </button>
        <button style={btnStyle('Cancelled')} onClick={() => setFilterStatus(filterStatus === 'Cancelled' ? 'All' : 'Cancelled')}>
          {data.counts.cancelled} Cancelled
        </button>
      </div>

      {/* Subscriptions Table */}
      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '1.5rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '0.83rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {['Customer', 'Plan', 'Cycle', 'Next Bill', 'Status'].map(h => (
                <th key={h} style={{ padding: '0.9rem 1rem', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No subscriptions found.</td></tr>
            ) : (
              filtered.map(s => (
                <tr
                  key={s.id}
                  style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => setActiveSubId(s.id)}
                >
                  <td style={{ padding: '1rem', fontWeight: '500', color: '#0f172a' }}>{s.customer_name}</td>
                  <td style={{ padding: '1rem', color: '#334155' }}>{s.plan_name}</td>
                  <td style={{ padding: '1rem', color: '#334155' }}>{s.cycle}</td>
                  <td style={{ padding: '1rem', color: '#334155' }}>
                    {s.next_bill_date
                      ? new Date(s.next_bill_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : '-'}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.2rem 0.7rem',
                      borderRadius: '4px',
                      fontSize: '0.82rem',
                      fontWeight: '600',
                      background: statusColors[s.status]?.light || '#f1f5f9',
                      color: statusColors[s.status]?.text || '#334155',
                    }}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Info Banner */}
      <div style={{ background: '#fef9c3', border: '1px solid #fde047', color: '#854d0e', padding: '0.9rem 1rem', borderRadius: '6px', fontSize: '0.9rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        Click a subscription row to open its billing detail and proration history.
      </div>

      {/* New Plan — Admin Only */}
      {user?.role === 'admin' && (
        <button
          onClick={() => setShowNewPlan(true)}
          style={{ padding: '0.6rem 1.2rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', color: '#0f172a', fontWeight: '500', cursor: 'pointer', fontSize: '0.95rem' }}
        >
          + New Plan (Admin)
        </button>
      )}

      {/* Modals */}
      {activeSubId && (
        <SubscriptionDetail
          subscriptionId={activeSubId}
          onClose={() => setActiveSubId(null)}
          onSuccess={() => { setActiveSubId(null); fetchData(); }}
        />
      )}
      {showNewPlan && (
        <NewPlanModal
          onClose={() => setShowNewPlan(false)}
          onSuccess={() => { setShowNewPlan(false); fetchData(); }}
        />
      )}
    </section>
  );
}
