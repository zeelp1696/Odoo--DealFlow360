import React, { useState, useEffect } from 'react';
import { getApprovalDetails, updateApproval } from '../api/approvalsApi.js';

export default function ApprovalDetail({ approvalId, onClose, onSuccess }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const details = await getApprovalDetails(approvalId);
        setData(details);
      } catch (err) {
        setError(err.message || 'Failed to load approval details');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [approvalId]);

  const handleAction = async (action) => {
    setIsSubmitting(true);
    setError('');
    try {
      await updateApproval(approvalId, action, note);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || `Failed to ${action.toLowerCase()}`);
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="builder-modal-overlay"><div className="builder-modal">Loading...</div></div>;
  if (!data || !data.approval) return <div className="builder-modal-overlay"><div className="builder-modal">Not found <button onClick={onClose}>Close</button></div></div>;

  const { approval, lines, audit_logs } = data;

  // Pipeline Logic
  const stages = [{ id: 'Submitted', label: 'Submitted' }];
  if (approval.requires_manager) stages.push({ id: 'Sales Manager', label: 'Sales Manager' });
  if (approval.requires_finance) stages.push({ id: 'Finance', label: 'Finance' });
  stages.push({ id: 'Confirmed', label: 'Confirmed' });

  const currentStageIndex = stages.findIndex(s => s.id === approval.current_stage);
  const getStageStatus = (index) => {
    if (approval.status === 'Approved' && index === stages.length - 1) return 'completed';
    if (approval.status === 'Rejected') return 'rejected';
    if (index < currentStageIndex) return 'completed';
    if (index === currentStageIndex) return 'current';
    return 'pending';
  };

  return (
    <div className="builder-modal-overlay">
      <div className="builder-modal" style={{ maxWidth: '1000px', width: '95%', position: 'relative', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)' }}>
        
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b', zIndex: 10 }}
        >
          &times;
        </button>

        <header className="modal-header" style={{ padding: '2rem 2rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: '#fff', flexShrink: 0 }}>
          <h2 style={{ fontSize: '1.6rem', margin: '0 0 0.5rem 0', color: '#0f172a' }}>
            Approval Detail: {approval.code} ({approval.customer_name})
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
            Opened by clicking a row on the Approvals list
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ background: '#ef4444', color: 'white', padding: '0.4rem 1rem', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.9rem' }}>
              Blended Risk: {approval.risk_label}
            </div>
            <div style={{ background: '#3b82f6', color: 'white', padding: '0.4rem 1rem', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.9rem' }}>
              Customer Tier: {approval.customer_tier || 'Standard'}
            </div>
          </div>
        </header>

        {error && <div className="error-message" style={{ margin: '1rem 2rem', flexShrink: 0 }}>{error}</div>}

        <div className="builder-split" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '2rem', background: '#f8fafc', flex: 1, overflowY: 'auto' }}>
          
          {/* Section 1: Flagged Lines */}
          <section>
            <h3 style={{ fontSize: '1.2rem', color: '#3b82f6', marginBottom: '1rem' }}>Why This Quote Was Flagged</h3>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.85rem' }}>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0' }}>Line</th>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0' }}>Discount Given</th>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0' }}>Limit Allowed</th>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0' }}>Over By</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1rem' }}>{line.product_name} ({line.category})</td>
                      <td style={{ padding: '1rem' }}>{line.discount_percent}%</td>
                      <td style={{ padding: '1rem' }}>{line.allowed_limit_percent}%</td>
                      <td style={{ padding: '1rem', color: '#dc2626', fontWeight: '500' }}>{line.over_limit_points} pt OVER</td>
                    </tr>
                  ))}
                  {lines.length === 0 && (
                    <tr><td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>No individual lines over limit (Flagged by Blended Risk only).</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div style={{ background: '#fef9c3', border: '1px solid #fde047', padding: '1rem', borderRadius: '8px', marginTop: '1rem', color: '#854d0e', fontSize: '0.9rem' }}>
              Worst single line plus overall pattern across the order sets the blended score. One bad line is enough to require approval.
            </div>
          </section>

          {/* Section 2: Pipeline */}
          <section style={{ margin: '2rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem' }}>
              {stages.map((stage, index) => {
                const status = getStageStatus(index);
                const isLast = index === stages.length - 1;
                return (
                  <React.Fragment key={stage.id}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', zIndex: 2 }}>
                      <div style={{ 
                        width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #1e293b',
                        background: status === 'completed' ? '#22c55e' : status === 'current' ? '#3b82f6' : status === 'rejected' ? '#ef4444' : '#cbd5e1',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {/* Circle */}
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: '500', color: '#334155' }}>{stage.label}</span>
                    </div>
                    {!isLast && (
                      <div style={{ flex: 1, height: '4px', background: '#1e293b', margin: '0 1rem', transform: 'translateY(-15px)' }}>
                        <div style={{ width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: '10px solid #1e293b', float: 'right', marginRight: '-5px', marginTop: '-4px' }}></div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </section>

          {/* Section 3: Audit Trail */}
          <section>
            <h3 style={{ fontSize: '1.2rem', color: '#0f172a', marginBottom: '1rem' }}>Audit Trail</h3>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.85rem' }}>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0' }}>User</th>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0' }}>Action</th>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0' }}>Date</th>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0' }}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {audit_logs.map((log, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1rem' }}>{log.user_name}</td>
                      <td style={{ padding: '1rem', fontWeight: '500' }}>{log.action}</td>
                      <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.9rem' }}>
                        {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '1rem', color: '#334155' }}>{log.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="portal-actions" style={{ padding: '1.5rem 2rem', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', flexShrink: 0 }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
            <label style={{ fontWeight: '500', color: '#475569' }}>Decision Note:</label>
            <input 
              type="text" 
              placeholder="Optional justification or feedback..." 
              value={note}
              onChange={e => setNote(e.target.value)}
              style={{ flex: 1, padding: '0.6rem 1rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              disabled={isSubmitting || approval.status !== 'Pending'}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => handleAction('Approved')} 
              disabled={isSubmitting || approval.status !== 'Pending'}
              style={{ background: '#22c55e', color: 'white', padding: '0.6rem 1.5rem', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', opacity: (isSubmitting || approval.status !== 'Pending') ? 0.5 : 1 }}
            >
              Approve
            </button>
            <button 
              onClick={() => handleAction('Returned')} 
              disabled={isSubmitting || approval.status !== 'Pending'}
              style={{ background: '#f59e0b', color: 'white', padding: '0.6rem 1.5rem', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', opacity: (isSubmitting || approval.status !== 'Pending') ? 0.5 : 1 }}
            >
              Return for Revision
            </button>
            <button 
              onClick={() => handleAction('Rejected')} 
              disabled={isSubmitting || approval.status !== 'Pending'}
              style={{ background: '#ef4444', color: 'white', padding: '0.6rem 1.5rem', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', opacity: (isSubmitting || approval.status !== 'Pending') ? 0.5 : 1 }}
            >
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
