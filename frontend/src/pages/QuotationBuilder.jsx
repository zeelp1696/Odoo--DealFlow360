import React, { useState, useEffect } from 'react';
import { getProducts, getCustomers } from '../api/catalogApi.js';
import { getCeilings } from '../api/discountsApi.js';
import { createQuotation, addLine, submitForApproval } from '../api/quotationsApi.js';

export default function QuotationBuilder() {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [ceilings, setCeilings] = useState([]);
  
  const [quoteForm, setQuoteForm] = useState({ customerId: '', productId: '', quantity: '1', discountPercent: '0' });
  const [quoteMessage, setQuoteMessage] = useState('');
  const [quoteResult, setQuoteResult] = useState(null);

  useEffect(() => {
    Promise.all([getCustomers(), getProducts(), getCeilings()])
      .then(([custData, prodData, ceilData]) => {
        setCustomers(custData || []);
        setProducts(prodData || []);
        setCeilings(ceilData || []);
      })
      .catch(err => setQuoteMessage(err.message));
  }, []);

  const handleCreateQuote = async (event) => {
    event.preventDefault();
    setQuoteMessage('');
    setQuoteResult(null);
    try {
      const quotation = await createQuotation(quoteForm.customerId);
      const lineData = await addLine(quotation.id, quoteForm);
      const submitData = await submitForApproval(quotation.id);
      
      setQuoteResult(submitData);
      setQuoteMessage(`${submitData.quotation.code} submitted as ${submitData.quotation.status}.`);
    } catch (err) {
      setQuoteMessage(err.message);
    }
  };

  const selectedCustomer = customers.find(c => String(c.id) === quoteForm.customerId);
  const selectedProduct = products.find(p => String(p.id) === quoteForm.productId);
  const selectedCeiling = ceilings.find(c => c.tier === selectedCustomer?.tier && c.category === selectedProduct?.category);
  const quoteOverLimit = selectedCeiling && Number(quoteForm.discountPercent) > Number(selectedCeiling.max_discount_percent);
  const quoteTotal = selectedProduct ? Number(selectedProduct.base_price) * Number(quoteForm.quantity || 0) * (1 - Number(quoteForm.discountPercent || 0) / 100) : 0;

  return (
    <section className="quote-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Quotation builder</span>
          <h2>Turn a customer need into a governed quote</h2>
        </div>
        <span className={`risk-pill ${quoteOverLimit ? 'risk-over' : 'risk-ok'}`}>
          {quoteOverLimit ? 'OVER LIMIT' : 'WITHIN RULES'}
        </span>
      </div>
      <form className="quote-form" onSubmit={handleCreateQuote}>
        <label>
          Customer
          <select value={quoteForm.customerId} onChange={e => setQuoteForm({ ...quoteForm, customerId: e.target.value })} required>
            <option value="">Choose customer</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name} · {c.tier}</option>)}
          </select>
        </label>
        <label>
          Product
          <select value={quoteForm.productId} onChange={e => setQuoteForm({ ...quoteForm, productId: e.target.value })} required>
            <option value="">Choose product</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name} · ${Number(p.base_price).toLocaleString()}</option>)}
          </select>
        </label>
        <label>
          Quantity
          <input type="number" min="1" value={quoteForm.quantity} onChange={e => setQuoteForm({ ...quoteForm, quantity: e.target.value })} required />
        </label>
        <label>
          Discount %
          <input type="number" min="0" max="100" step="0.01" value={quoteForm.discountPercent} onChange={e => setQuoteForm({ ...quoteForm, discountPercent: e.target.value })} required />
        </label>
        <div className="quote-summary">
          <small>LIVE CHECK</small>
          <strong>{selectedCeiling ? `Limit ${selectedCeiling.max_discount_percent}%` : 'Select customer and product'}</strong>
          <span>{selectedProduct ? `Quote total $${quoteTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : 'Add a product to calculate total'}</span>
        </div>
        <button type="submit" className="btn-gold">Submit governed quote ↗</button>
      </form>
      {quoteMessage && (
        <div className="quote-result">
          {quoteMessage}
          {quoteResult && (
            <span>Risk {quoteResult.risk.score} · {quoteResult.risk.riskLabel}{quoteResult.risk.requiresFinance ? ' · Finance required' : quoteResult.risk.requiresManager ? ' · Manager required' : ' · No approval required'}</span>
          )}
        </div>
      )}
    </section>
  );
}
