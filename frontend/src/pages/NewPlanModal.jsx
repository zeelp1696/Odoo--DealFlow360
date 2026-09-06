import React, { useState, useEffect } from 'react';
import { apiGet } from '../api/client.js';
import { createSubscription } from '../api/subscriptionsApi.js';

export default function NewPlanModal({ onClose, onSuccess }) {
  const [customers, setCustomers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({ customer_id: '', plan_id: '', quantity: 1, next_bill_date: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadOptions() {
      try {
        const [cRes, pRes] = await Promise.all([
          apiGet('/catalog/customers'),
          apiGet('/catalog/subscription-plans'),
        ]);
        setCustomers(cRes.customers || cRes || []);
        setPlans(pRes.plans || pRes || []);
      } catch (e) {
        setError('Failed to load customers or plans: ' + e.message);
      }
    }
    loadOptions();
  }, []);

  const handleSubmit = async () => {
    if (!form.customer_id || !form.plan_id) {
      setError('Customer and Plan are required.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await createSubscription(form);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to create subscription');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="builder-modal-overlay">
      <div style={{ background: '#fff', borderRadius: '8px', width: '90%', maxWidth: '520px', padding: '2rem', position: 'relative', boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1.2rem', background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
        
        <h2 style={{ fontSize: '1.3rem', margin: '0 0 0.4rem 0', color: '#0f172a' }}>New Subscription Plan</h2>
        <p style={{ margin: '0 0 1.5rem 0', color: '#64748b', fontSize: '0.9rem' }}>Admin only — Create a new recurring subscription for a customer.</p>

        {error && <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.9rem' }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.4rem', color: '#334155', fontSize: '0.9rem' }}>Customer *</label>
            <select value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
              style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
              <option value="">Select customer...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.4rem', color: '#334155', fontSize: '0.9rem' }}>Plan *</label>
            <select value={form.plan_id} onChange={e => setForm(f => ({ ...f, plan_id: e.target.value }))}
              style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
              <option value="">Select plan...</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.name} ({p.cycle}) — ${p.price}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.4rem', color: '#334155', fontSize: '0.9rem' }}>Quantity</label>
              <input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.4rem', color: '#334155', fontSize: '0.9rem' }}>Next Bill Date</label>
              <input type="date" value={form.next_bill_date} onChange={e => setForm(f => ({ ...f, next_bill_date: e.target.value }))}
                style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
          <button onClick={onClose} style={{ padding: '0.6rem 1.2rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={isSubmitting}
            style={{ padding: '0.6rem 1.4rem', border: 'none', borderRadius: '6px', background: '#1d4ed8', color: '#fff', fontWeight: '600', cursor: 'pointer', opacity: isSubmitting ? 0.6 : 1 }}>
            {isSubmitting ? 'Creating...' : 'Create Subscription'}
          </button>
        </div>
      </div>
    </div>
  );
}
