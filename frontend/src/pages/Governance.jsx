import React, { useState, useEffect } from 'react';
import { getCeilings, getApprovalRules } from '../api/discountsApi.js';
import { apiPut } from '../api/client.js';

export default function Governance({ user }) {
  const [governanceError, setGovernanceError] = useState('');
  const [localCeilings, setLocalCeilings] = useState([]);
  const [localRules, setLocalRules] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const fetchGovernance = () => {
    Promise.all([getCeilings(), getApprovalRules()])
      .then(([ceilings, rules]) => {
        setLocalCeilings(ceilings || []);
        setLocalRules(rules || []);
      })
      .catch(error => setGovernanceError(error.message));
  };

  useEffect(() => {
    fetchGovernance();
  }, []);

  const handleCeilingChange = (index, value) => {
    const newCeilings = [...localCeilings];
    newCeilings[index].max_discount_percent = value;
    setLocalCeilings(newCeilings);
  };

  const handleRuleChange = (index, field, value) => {
    const newRules = [...localRules];
    newRules[index][field] = value;
    setLocalRules(newRules);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setGovernanceError('');
    try {
      await Promise.all([
        ...localCeilings.map(c => apiPut(`/discounts/ceilings/${c.id}`, { maxDiscountPercent: Number(c.max_discount_percent) || 0 })),
        ...localRules.map(r => apiPut(`/discounts/approval-rules/${r.id}`, { 
          minOverLimitPoints: Number(r.min_over_limit_points) || 0, 
          maxOverLimitPoints: r.max_over_limit_points ? Number(r.max_over_limit_points) : null,
          requiresManager: r.requires_manager,
          requiresFinance: r.requires_finance,
          riskLabel: r.risk_label
        }))
      ]);
      alert('Configuration saved successfully!');
      fetchGovernance();
    } catch (error) {
      setGovernanceError('Error saving configuration: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mockup-page-container">
      <div className="mockup-title">Discount tiers and approval chains</div>
      
      {governanceError && <div className="error" style={{ color: 'red', marginBottom: '1rem' }}>{governanceError}</div>}

      <div className="mockup-subtitle" style={{marginBottom: '0.5rem', fontSize: '0.8rem', marginTop: '2rem'}}>Discount Ceilings (Tier & Category)</div>
      <table className="mockup-table">
        <thead>
          <tr>
            <th>Tier</th>
            <th>Category</th>
            <th>Max Discount (%)</th>
          </tr>
        </thead>
        <tbody>
          {localCeilings.map((c, i) => (
            <tr key={c.id}>
              <td>{c.tier}</td>
              <td>{c.category}</td>
              <td>
                <input 
                  type="number" 
                  min="0" 
                  step="0.01" 
                  value={c.max_discount_percent} 
                  onChange={(e) => handleCeilingChange(i, e.target.value)} 
                  style={{ padding: '0.4rem', width: '100px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </td>
            </tr>
          ))}
          {localCeilings.length === 0 && (
            <tr><td colSpan="3" style={{textAlign: 'center'}}>No discount ceilings found</td></tr>
          )}
        </tbody>
      </table>

      <div className="mockup-subtitle" style={{marginBottom: '0.5rem', fontSize: '0.8rem', marginTop: '2rem'}}>Approval Chain Rules</div>
      <table className="mockup-table">
        <thead>
          <tr>
            <th>Min Risk Points</th>
            <th>Max Risk Points</th>
            <th>Requires Manager</th>
            <th>Requires Finance</th>
            <th>Risk Label</th>
          </tr>
        </thead>
        <tbody>
          {localRules.map((r, i) => (
            <tr key={r.id}>
              <td>
                <input 
                  type="number" 
                  min="0" 
                  step="0.01" 
                  value={r.min_over_limit_points} 
                  onChange={(e) => handleRuleChange(i, 'min_over_limit_points', e.target.value)} 
                  style={{ padding: '0.4rem', width: '80px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </td>
              <td>
                <input 
                  type="number" 
                  min="0" 
                  step="0.01" 
                  placeholder="No Limit"
                  value={r.max_over_limit_points || ''} 
                  onChange={(e) => handleRuleChange(i, 'max_over_limit_points', e.target.value)} 
                  style={{ padding: '0.4rem', width: '80px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </td>
              <td>
                <input 
                  type="checkbox" 
                  checked={r.requires_manager} 
                  onChange={(e) => handleRuleChange(i, 'requires_manager', e.target.checked)} 
                />
              </td>
              <td>
                <input 
                  type="checkbox" 
                  checked={r.requires_finance} 
                  onChange={(e) => handleRuleChange(i, 'requires_finance', e.target.checked)} 
                />
              </td>
              <td>
                <select 
                  value={r.risk_label} 
                  onChange={(e) => handleRuleChange(i, 'risk_label', e.target.value)}
                  style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </td>
            </tr>
          ))}
          {localRules.length === 0 && (
            <tr><td colSpan="5" style={{textAlign: 'center'}}>No approval rules found</td></tr>
          )}
        </tbody>
      </table>

      {(user.role === 'admin' || user.role === 'sales_manager') && (
        <button 
          className="btn-gold" 
          style={{ marginTop: '1rem', padding: '0.8rem 2rem' }} 
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save configuration'}
        </button>
      )}

      <div className="mockup-alert-yellow" style={{ marginTop: '2rem' }}>
        When a quote mixes categories with different ceilings, the system must compute a blended risk score and route to the highest required level.<br />
        All approvals, rejections, and edits must be logged with user, timestamp, and reason.
      </div>
    </section>
  );
}
