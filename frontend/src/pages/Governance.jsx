import React, { useState, useEffect } from 'react';
import { getCeilings, getApprovalRules } from '../api/discountsApi.js';
import { apiPost } from '../api/client.js';

export default function Governance({ user }) {
  const [governance, setGovernance] = useState({ ceilings: [], rules: [] });
  const [governanceError, setGovernanceError] = useState('');
  
  const [ceilingForm, setCeilingForm] = useState({ tier: 'Gold', category: 'Services', maxDiscountPercent: '10' });
  const [governanceMessage, setGovernanceMessage] = useState('');

  const fetchGovernance = () => {
    Promise.all([getCeilings(), getApprovalRules()])
      .then(([ceilings, rules]) => {
        setGovernance({ ceilings: ceilings || [], rules: rules || [] });
      })
      .catch(error => setGovernanceError(error.message));
  };

  useEffect(() => {
    fetchGovernance();
  }, []);

  const addCeiling = async event => { 
    event.preventDefault(); 
    setGovernanceMessage(''); 
    try {
      const data = await apiPost('/discounts/ceilings', ceilingForm);
      setGovernanceMessage(`${data.ceiling.tier} ${data.ceiling.category} ceiling saved and audited.`); 
      fetchGovernance();
    } catch (err) {
      setGovernanceMessage(err.message); 
    }
  };

  const { ceilings, rules } = governance;

  return (
    <section className="governance-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Discount governance</span>
          <h2>Rules before revenue</h2>
        </div>
        <span className="data-count">{rules.length} approval stages</span>
      </div>
      
      {governanceError && <div className="error">{governanceError}</div>}
      
      <div className="governance-grid">
        <div className="data-panel">
          <small>DISCOUNT CEILINGS</small>
          {ceilings.map(ceiling => (
            <div className="data-row" key={ceiling.id}>
              <div>
                <strong>{ceiling.tier} / {ceiling.category}</strong>
                <span>Maximum allowed before routing</span>
              </div>
              <b>{ceiling.max_discount_percent}%</b>
            </div>
          ))}
        </div>
        <div className="data-panel">
          <small>APPROVAL CHAIN</small>
          {rules.map(rule => (
            <div className="data-row" key={rule.id}>
              <div>
                <strong>{rule.risk_label} risk</strong>
                <span>{rule.min_over_limit_points}{rule.max_over_limit_points ? `–${rule.max_over_limit_points}` : '+'} points over limit</span>
              </div>
              <b>{rule.requires_finance ? 'Finance' : 'Manager'}</b>
            </div>
          ))}
        </div>
      </div>
      
      {['admin', 'sales_manager'].includes(user.role) && (
        <form className="add-product" onSubmit={addCeiling}>
          <div>
            <small>GOVERNANCE ACTION</small>
            <h3>Add ceiling</h3>
          </div>
          <select value={ceilingForm.tier} onChange={event => setCeilingForm({ ...ceilingForm, tier: event.target.value })}>
            <option>Gold</option>
            <option>Silver</option>
            <option>Bronze</option>
          </select>
          <select value={ceilingForm.category} onChange={event => setCeilingForm({ ...ceilingForm, category: event.target.value })}>
            <option>Hardware</option>
            <option>Services</option>
            <option>Subscriptions</option>
          </select>
          <input type="number" min="0" max="100" step="0.01" value={ceilingForm.maxDiscountPercent} onChange={event => setCeilingForm({ ...ceilingForm, maxDiscountPercent: event.target.value })} />
          <button type="submit" className="btn-gold">Save ceiling ↗</button>
          {governanceMessage && <span className="form-message">{governanceMessage}</span>}
        </form>
      )}
    </section>
  );
}
