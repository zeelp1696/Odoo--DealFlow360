import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '../api/client.js';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Pipeline stepper matching the mockup
const PIPELINE_STEPS = [
  { key: 'confirmed', label: 'Order Confirmed' },
  { key: 'shipped',   label: 'Shipped' },
  { key: 'invoiced',  label: 'Invoiced' },
  { key: 'paid',      label: 'Paid' },
];

function PipelineStepper({ currentStage }) {
  const currentIdx = PIPELINE_STEPS.findIndex(s => s.key === currentStage);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: '2rem' }}>
      {PIPELINE_STEPS.map((step, i) => {
        const done = i <= currentIdx;
        const active = i === currentIdx;
        return (
          <React.Fragment key={step.key}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? (active ? '#3b82f6' : '#22c55e') : '#e2e8f0',
                border: `3px solid ${done ? (active ? '#3b82f6' : '#22c55e') : '#cbd5e1'}`,
                color: '#fff', fontWeight: '700', fontSize: '1rem',
                boxShadow: active ? '0 0 0 4px #bfdbfe' : 'none',
                transition: 'all 0.3s',
              }}>
                {done && !active ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: '0.78rem', color: done ? '#0f172a' : '#94a3b8', fontWeight: done ? '600' : '400', whiteSpace: 'nowrap' }}>
                {step.label}
              </span>
            </div>
            {i < PIPELINE_STEPS.length - 1 && (
              <div style={{ flex: 1, height: '3px', background: i < currentIdx ? '#22c55e' : '#e2e8f0', margin: '0 0.25rem 1.4rem', transition: 'background 0.3s' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function RecordPaymentModal({ invoice, onClose, onSuccess }) {
  const [amount, setAmount] = useState(Number(invoice.amount).toFixed(2));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) { setError('Enter a valid amount.'); return; }
    setIsSubmitting(true);
    setError('');
    try {
      await apiPost(`/invoices/${invoice.id}/record-payment`, { amount: Number(amount) });
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to record payment');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="builder-modal-overlay">
      <div style={{ background: '#fff', borderRadius: '10px', padding: '2rem', width: '90%', maxWidth: '420px', position: 'relative', boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1.2rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f172a' }}>Record Payment</h3>
        <p style={{ margin: '0 0 1.5rem 0', color: '#64748b', fontSize: '0.9rem' }}>Invoice {invoice.invoice_number} — Due ${Number(invoice.amount).toFixed(2)}</p>
        {error && <div style={{ padding: '0.6rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.4rem', fontSize: '0.9rem', color: '#334155' }}>Payment Amount ($)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="0" step="0.01"
            style={{ width: '100%', padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '1rem', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button onClick={onClose} style={{ padding: '0.6rem 1.2rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={isSubmitting}
            style={{ padding: '0.6rem 1.4rem', border: 'none', borderRadius: '6px', background: '#22c55e', color: '#fff', fontWeight: '700', cursor: 'pointer', opacity: isSubmitting ? 0.6 : 1 }}>
            {isSubmitting ? 'Recording...' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

function InvoiceDetailModal({ invoiceId, onClose, onSuccess }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet(`/invoices/${invoiceId}`);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => { load(); }, [load]);

  const handleDownload = async () => {
    const session = JSON.parse(localStorage.getItem('dealflow-session') || '{}');
    const token = session.token;
    const response = await fetch(`${BASE_URL}/invoices/${invoiceId}/download`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) { setError('Download failed'); return; }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data?.invoice?.invoice_number || 'invoice'}-summary.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div className="builder-modal-overlay">
      <div className="builder-modal" style={{ maxWidth: '860px', width: '95%', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '250px' }}>
        <span style={{ color: '#64748b' }}>Loading...</span>
      </div>
    </div>
  );

  if (!data?.invoice) return (
    <div className="builder-modal-overlay">
      <div className="builder-modal" style={{ maxWidth: '860px', width: '95%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
        <span style={{ color: '#dc2626' }}>Invoice not found.</span>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );

  const { invoice, payments, related_invoices, credit_notes, pipeline_stage } = data;
  const statusColor = invoice.status === 'Paid' ? { bg: '#dcfce7', text: '#15803d' } : { bg: '#fee2e2', text: '#b91c1c' };

  return (
    <>
      <div className="builder-modal-overlay">
        <div className="builder-modal" style={{ maxWidth: '900px', width: '95%', position: 'relative', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)' }}>
          
          <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b', zIndex: 10 }}>&times;</button>

          {/* Header */}
          <header style={{ padding: '2rem 2rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: '#fff', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <h2 style={{ fontSize: '1.6rem', margin: 0, color: '#0f172a' }}>
                Invoice Detail: {invoice.invoice_number} ({invoice.customer_name || 'N/A'})
              </h2>
              <span style={{ padding: '0.3rem 0.9rem', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '700', background: statusColor.bg, color: statusColor.text }}>
                {invoice.status}
              </span>
            </div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Opened by clicking a row on the Invoices list</p>
          </header>

          {error && <div style={{ margin: '0.75rem 2rem', padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.9rem', flexShrink: 0 }}>{error}</div>}

          {/* Scrollable Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Pipeline Stepper */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.5rem 2rem' }}>
              <PipelineStepper currentStage={pipeline_stage} />
            </div>

            {/* Related Invoices for this customer */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.83rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #e2e8f0' }}>Invoice #</th>
                    <th style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #e2e8f0' }}>Amount</th>
                    <th style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                    <th style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #e2e8f0' }}>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {related_invoices.length === 0 ? (
                    <tr><td colSpan="4" style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>No other invoices found.</td></tr>
                  ) : (
                    related_invoices.map((ri, i) => {
                      const sc = ri.status === 'Paid' ? { bg: '#dcfce7', text: '#15803d' } : { bg: '#fee2e2', text: '#b91c1c' };
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', background: ri.id === invoice.id ? '#eff6ff' : 'transparent' }}>
                          <td style={{ padding: '0.9rem 1rem', fontWeight: '600', color: '#0f172a' }}>
                            {ri.invoice_number}{ri.is_recurring ? ' (Recurring)' : ''}
                            {ri.id === invoice.id && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#3b82f6' }}>← current</span>}
                          </td>
                          <td style={{ padding: '0.9rem 1rem', color: '#334155' }}>${Number(ri.amount).toFixed(2)}</td>
                          <td style={{ padding: '0.9rem 1rem' }}>
                            <span style={{ padding: '0.2rem 0.7rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '700', background: sc.bg, color: sc.text }}>{ri.status}</span>
                          </td>
                          <td style={{ padding: '0.9rem 1rem', color: '#334155' }}>
                            {ri.due_date ? new Date(ri.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Payments received */}
            {payments.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#0f172a', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payments Received</h4>
                {payments.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: i < payments.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <span style={{ fontSize: '0.9rem', color: '#334155' }}>{new Date(p.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#22c55e' }}>${Number(p.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Credit Notes */}
            {credit_notes.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem 1.5rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#0f172a', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Credit Notes</h4>
                {credit_notes.map((cn, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: i < credit_notes.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <span style={{ fontSize: '0.9rem', color: '#334155' }}>{cn.reason}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#f59e0b' }}>-${Number(cn.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Reconciliation note */}
            <div style={{ background: '#fef9c3', border: '1px solid #fde047', color: '#854d0e', padding: '0.9rem 1rem', borderRadius: '6px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              Partial invoicing stays reconciled with partial delivery, nothing is billed before it ships.
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', gap: '1rem', flexShrink: 0 }}>
            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={invoice.status === 'Paid'}
              style={{ padding: '0.65rem 1.5rem', border: 'none', borderRadius: '6px', background: invoice.status === 'Paid' ? '#a3e635' : '#22c55e', color: '#fff', fontWeight: '700', cursor: 'pointer', opacity: invoice.status === 'Paid' ? 0.5 : 1 }}
            >
              {invoice.status === 'Paid' ? '✓ Already Paid' : 'Record Payment'}
            </button>
            <button
              onClick={handleDownload}
              style={{ padding: '0.65rem 1.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', color: '#0f172a', fontWeight: '500', cursor: 'pointer' }}
            >
              Download Summary
            </button>
          </div>
        </div>
      </div>

      {showPaymentModal && (
        <RecordPaymentModal
          invoice={invoice}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => { setShowPaymentModal(false); load(); if (onSuccess) onSuccess(); }}
        />
      )}
    </>
  );
}

export default function InvoicesPage() {
  const [data, setData] = useState({ invoices: [], counts: { unpaid: 0, paid: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [activeInvoiceId, setActiveInvoiceId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet('/invoices');
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = filterStatus === 'All' ? data.invoices : data.invoices.filter(i => i.status === filterStatus);

  return (
    <section style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', margin: '0 0 0.4rem 0', color: '#0f172a' }}>Invoices (List)</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>Every invoice generated from one-time and recurring orders</p>
      </div>

      {error && <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{error}</div>}

      {/* Status Counter Pills */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: `${data.counts.unpaid} Unpaid`, status: 'Unpaid', bg: '#ef4444', activeBg: '#dc2626' },
          { label: `${data.counts.paid} Paid`, status: 'Paid', bg: '#22c55e', activeBg: '#16a34a' },
        ].map(p => (
          <button key={p.status}
            onClick={() => setFilterStatus(filterStatus === p.status ? 'All' : p.status)}
            style={{
              padding: '0.4rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: filterStatus === p.status ? p.activeBg : p.bg,
              color: '#fff', fontWeight: '700', fontSize: '0.9rem', transition: 'background 0.15s'
            }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Invoices Table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '1.5rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '0.83rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {['Invoice #', 'Customer', 'Amount', 'Status', 'Due Date'].map(h => (
                <th key={h} style={{ padding: '0.9rem 1rem', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>No invoices found.</td></tr>
            ) : (
              filtered.map(inv => {
                const sc = inv.status === 'Paid' ? { bg: '#dcfce7', text: '#15803d' } : { bg: '#fee2e2', text: '#b91c1c' };
                return (
                  <tr key={inv.id}
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => setActiveInvoiceId(inv.id)}
                  >
                    <td style={{ padding: '1rem', fontWeight: '600', color: '#0f172a' }}>
                      {inv.invoice_number}
                      {inv.is_recurring && <span style={{ marginLeft: '0.5rem', fontSize: '0.72rem', background: '#ede9fe', color: '#7c3aed', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>Recurring</span>}
                    </td>
                    <td style={{ padding: '1rem', color: '#334155' }}>{inv.customer_name || '—'}</td>
                    <td style={{ padding: '1rem', color: '#334155', fontWeight: '500' }}>${Number(inv.amount).toFixed(2)}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ padding: '0.2rem 0.7rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '700', background: sc.bg, color: sc.text }}>{inv.status}</span>
                    </td>
                    <td style={{ padding: '1rem', color: '#334155' }}>
                      {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Hint banner */}
      <div style={{ background: '#fef9c3', border: '1px solid #fde047', color: '#854d0e', padding: '0.9rem 1rem', borderRadius: '6px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        Click an invoice row to open its full payment and delivery reconciliation detail.
      </div>

      {/* Detail Modal */}
      {activeInvoiceId && (
        <InvoiceDetailModal
          invoiceId={activeInvoiceId}
          onClose={() => setActiveInvoiceId(null)}
          onSuccess={() => { setActiveInvoiceId(null); fetchData(); }}
        />
      )}
    </section>
  );
}
