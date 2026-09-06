import React, { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../api/client.js';

export default function Billing() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet('/billing/invoices')
      .then(data => {
        setInvoices(data.invoices || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleRecordPayment = async (invoiceId) => {
    try {
      const res = await apiPost(`/payments/${invoiceId}/pay`);
      setInvoices(prev => prev.map(inv => inv.id === invoiceId ? res.invoice : inv));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading invoices...</div>;
  if (error) return <div className="error" style={{ margin: '2rem' }}>{error}</div>;

  return (
    <section className="mockup-page-container">
      <div className="mockup-title">Invoices & Billing</div>
      <div className="mockup-subtitle">Manage customer payments, recurring billing, and outstanding balances.</div>

      {invoices.length === 0 ? (
        <div style={{ marginTop: '3rem', color: '#64736a' }}>No invoices generated yet. Approving a quotation will automatically generate invoices here.</div>
      ) : (
        <table className="mockup-table" style={{ marginTop: '2rem' }}>
          <thead>
            <tr>
              <th>Invoice Number</th>
              <th>Customer</th>
              <th>Quotation</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(invoice => (
              <tr key={invoice.id}>
                <td><strong>{invoice.invoice_number}</strong></td>
                <td>{invoice.customer_name}</td>
                <td>{invoice.quotation_code}</td>
                <td>
                  {invoice.is_recurring ? (
                    <span style={{ background: '#e2b75b', color: '#17231f', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>Recurring</span>
                  ) : (
                    <span style={{ background: '#e8eee9', color: '#17231f', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>One-time</span>
                  )}
                </td>
                <td>${Number(invoice.amount).toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</td>
                <td>{new Date(invoice.due_date).toLocaleDateString()}</td>
                <td>
                  <span className={`status-badge status-${invoice.status.toLowerCase().replace(' ', '-')}`}>
                    {invoice.status}
                  </span>
                </td>
                <td>
                  {invoice.status === 'Unpaid' ? (
                    <button type="button" className="btn-outline btn-small" onClick={() => handleRecordPayment(invoice.id)}>Record Payment</button>
                  ) : (
                    <span style={{ color: '#64736a', fontSize: '0.9rem' }}>Paid</span>
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
