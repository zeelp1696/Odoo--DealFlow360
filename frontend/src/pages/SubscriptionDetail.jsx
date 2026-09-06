import React, { useState, useEffect } from 'react';
import { getSubscriptionDetail, updateSubscription } from '../api/subscriptionsApi.js';

export default function SubscriptionDetail({ subscriptionId, onClose, onSuccess }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await getSubscriptionDetail(subscriptionId);
        setData(res);
      } catch (err) {
        setError(err.message || 'Failed to load subscription details');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [subscriptionId]);

  const handleAction = async (action) => {
    if (action === 'cancel' && !confirmCancel) {
      setConfirmCancel(true);
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await updateSubscription(subscriptionId, action);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Action failed');
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="builder-modal-overlay">
      <div className="builder-modal" style={{ maxWidth: '800px', width: '95%', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
        <span style={{ color: '#64748b' }}>Loading...</span>
      </div>
    </div>
  );

  if (!data?.subscription) return (
    <div className="builder-modal-overlay">
      <div className="builder-modal" style={{ maxWidth: '800px', width: '95%', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <span style={{ color: '#dc2626' }}>Subscription not found.</span>
        <button onClick={onClose} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>Close</button>
      </div>
    </div>
  );

  const { subscription, one_time_lines, recurring_lines } = data;
  const isCancelled = subscription.status === 'Cancelled';

  return (
    <div className="builder-modal-overlay">
      <div className="builder-modal" style={{ maxWidth: '900px', width: '95%', position: 'relative', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)' }}>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b', zIndex: 10 }}
        >
          &times;
        </button>

        {/* Header */}
        <header style={{ padding: '2rem 2rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: '#fff', flexShrink: 0 }}>
          <h2 style={{ fontSize: '1.6rem', margin: '0 0 0.4rem 0', color: '#0f172a' }}>
            Billing Detail: {subscription.customer_name} — {subscription.plan_name}
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
            Opened by clicking a row on the Subscriptions list
          </p>
        </header>

        {error && (
          <div style={{ margin: '0.75rem 2rem', padding: '0.75rem 1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.9rem', flexShrink: 0 }}>
            {error}
          </div>
        )}

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* One-Time Lines */}
          <section>
            <h3 style={{ color: '#3b82f6', fontSize: '1.1rem', margin: '0 0 1rem 0', fontWeight: '500' }}>
              One-Time Lines (from originating order)
            </h3>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.83rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #e2e8f0' }}>Product</th>
                    <th style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #e2e8f0' }}>Qty</th>
                    <th style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #e2e8f0' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {one_time_lines.length === 0 ? (
                    <tr><td colSpan="3" style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>No one-time lines found for this order.</td></tr>
                  ) : (
                    one_time_lines.map((l, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.9rem 1rem', fontWeight: '500', color: '#0f172a' }}>{l.product_name}</td>
                        <td style={{ padding: '0.9rem 1rem', color: '#334155' }}>{l.quantity}</td>
                        <td style={{ padding: '0.9rem 1rem', color: '#334155' }}>${Number(l.amount).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Recurring Lines */}
          <section>
            <h3 style={{ color: '#3b82f6', fontSize: '1.1rem', margin: '0 0 1rem 0', fontWeight: '500' }}>
              Recurring Lines
            </h3>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.83rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #e2e8f0' }}>Plan</th>
                    <th style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #e2e8f0' }}>Cycle</th>
                    <th style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #e2e8f0' }}>Next Bill Date</th>
                    <th style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #e2e8f0' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recurring_lines.length === 0 ? (
                    <tr><td colSpan="4" style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>No recurring subscriptions.</td></tr>
                  ) : (
                    recurring_lines.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.9rem 1rem', fontWeight: '500', color: '#0f172a' }}>{r.plan_name}</td>
                        <td style={{ padding: '0.9rem 1rem', color: '#334155' }}>{r.cycle}</td>
                        <td style={{ padding: '0.9rem 1rem', color: '#334155' }}>
                          {r.next_bill_date
                            ? new Date(r.next_bill_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : '-'}
                        </td>
                        <td style={{ padding: '0.9rem 1rem', color: '#334155' }}>${Number(r.amount).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', gap: '1rem', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', flexShrink: 0 }}>
          <button
            onClick={() => handleAction('modify')}
            disabled={isSubmitting || isCancelled}
            style={{ padding: '0.6rem 1.4rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', color: '#0f172a', fontWeight: '500', cursor: 'pointer', opacity: (isSubmitting || isCancelled) ? 0.5 : 1 }}
          >
            Modify Subscription
          </button>
          {confirmCancel ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ color: '#dc2626', fontSize: '0.9rem', fontWeight: '500' }}>Are you sure?</span>
              <button
                onClick={() => handleAction('cancel')}
                disabled={isSubmitting}
                style={{ padding: '0.6rem 1.4rem', border: '2px solid #ef4444', borderRadius: '6px', background: '#ef4444', color: '#fff', fontWeight: '700', cursor: 'pointer', opacity: isSubmitting ? 0.5 : 1 }}
              >
                Confirm Cancel
              </button>
              <button
                onClick={() => setConfirmCancel(false)}
                style={{ padding: '0.6rem 1rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', color: '#475569', cursor: 'pointer' }}
              >
                Back
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleAction('cancel')}
              disabled={isSubmitting || isCancelled}
              style={{ padding: '0.6rem 1.4rem', border: '2px solid #ef4444', borderRadius: '6px', background: '#fff', color: '#ef4444', fontWeight: '600', cursor: 'pointer', opacity: (isSubmitting || isCancelled) ? 0.5 : 1 }}
            >
              {isCancelled ? 'Already Cancelled' : 'Cancel Subscription'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
