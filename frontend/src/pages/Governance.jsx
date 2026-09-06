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
    if (index < 0) return;
    const newCeilings = [...localCeilings];
    newCeilings[index].max_discount_percent = value;
    setLocalCeilings(newCeilings);
  };

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTier, setSelectedTier] = useState('');
  const [isSavingCeiling, setIsSavingCeiling] = useState(false);

  const categories = [...new Set(localCeilings.map(c => c.category))];
  const tiers = [...new Set(localCeilings.map(c => c.tier))];

  useEffect(() => {
    if (!selectedCategory && categories.length > 0) setSelectedCategory(categories[0]);
    if (!selectedTier && tiers.length > 0) setSelectedTier(tiers[0]);
  }, [categories, tiers, selectedCategory, selectedTier]);

  const currentCeilingIndex = localCeilings.findIndex(c => c.category === selectedCategory && c.tier === selectedTier);
  const currentCeiling = currentCeilingIndex >= 0 ? localCeilings[currentCeilingIndex] : null;

  const handleSaveCeiling = async () => {
    if (!currentCeiling) return;
    setIsSavingCeiling(true);
    setGovernanceError('');
    try {
      await apiPut(`/discounts/ceilings/${currentCeiling.id}`, { maxDiscountPercent: Number(currentCeiling.max_discount_percent) || 0 });
      alert('Discount ceiling saved successfully!');
      fetchGovernance();
    } catch (error) {
      setGovernanceError('Error saving discount ceiling: ' + error.message);
    } finally {
      setIsSavingCeiling(false);
    }
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
        ...localRules.map(r => apiPut(`/discounts/approval-rules/${r.id}`, { 
          minOverLimitPoints: Number(r.min_over_limit_points) || 0, 
          maxOverLimitPoints: r.max_over_limit_points ? Number(r.max_over_limit_points) : null,
          requiresManager: r.requires_manager,
          requiresFinance: r.requires_finance,
          riskLabel: r.risk_label
        }))
      ]);
      alert('Approval rules saved successfully!');
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
      
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: '#475569', fontWeight: '500' }}>Category</label>
          <select 
            value={selectedCategory} 
            onChange={e => setSelectedCategory(e.target.value)} 
            style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: '#475569', fontWeight: '500' }}>Tier</label>
          <select 
            value={selectedTier} 
            onChange={e => setSelectedTier(e.target.value)} 
            style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
          >
            {tiers.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: '#475569', fontWeight: '500' }}>Max Discount (%)</label>
          <input 
            type="number" 
            min="0" step="0.01" 
            disabled={!currentCeiling}
            value={currentCeiling ? currentCeiling.max_discount_percent : ''} 
            onChange={(e) => handleCeilingChange(currentCeilingIndex, e.target.value)}
            style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          />
        </div>
        <div style={{ flex: '0 0 auto' }}>
          <button className="btn-gold" style={{ padding: '0.6rem 1.5rem', height: '100%' }} onClick={handleSaveCeiling} disabled={!currentCeiling || isSavingCeiling}>
            {isSavingCeiling ? 'Saving...' : 'Save Discount'}
          </button>
        </div>
      </div>

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
