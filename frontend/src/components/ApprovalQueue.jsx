import React, { useEffect, useState } from 'react';
import { decideApproval, getPendingApprovals } from '../api/approvals.js';

export default function ApprovalQueue({ session }) {
  const [approvals, setApprovals] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const refresh = async () => {
    try { setApprovals(await getPendingApprovals(session.token)); }
    catch (exception) { setError(exception.message); }
  };
  useEffect(() => { refresh(); }, [session.token]);

  const decide = async (approvalId, action) => {
    setError(''); setMessage('');
    try { const result = await decideApproval(session.token, approvalId, action); setMessage(`Approval updated. Quotation is now ${result.quotationStatus}.`); await refresh(); }
    catch (exception) { setError(exception.message); }
  };

  return <section className="approval-section">
    <div className="section-heading"><div><span className="eyebrow">Approval queue</span><h2>Decisions with a paper trail</h2></div><span className="data-count">{approvals.length} pending</span></div>
    {error && <div className="error">{error}</div>}{message && <div className="form-message approval-message">{message}</div>}
    {!approvals.length && !error && <div className="empty-panel">No pending approvals for your role.</div>}
    <div className="approval-list">{approvals.map(approval => <article className="approval-card" key={approval.id}><div><span className="eyebrow">{approval.code} · {approval.current_stage}</span><h3>{approval.customer_name}</h3><p>Created by {approval.rep_name} · {approval.risk_label} risk · score {approval.blended_risk_score}</p></div><div className="approval-actions"><button onClick={() => decide(approval.id, 'Approved')}>Approve</button><button className="secondary-action" onClick={() => decide(approval.id, 'Returned')}>Return</button><button className="danger-action" onClick={() => decide(approval.id, 'Rejected')}>Reject</button></div></article>)}</div>
  </section>;
}