import React, { useState, useEffect } from 'react';
import { getApprovals } from '../api/approvalsApi.js';
import ApprovalDetail from './ApprovalDetail.jsx';

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('Pending');
  const [activeApprovalId, setActiveApprovalId] = useState(null);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getApprovals();
      setApprovals(data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch approvals');
    } finally {
      setLoading(false);
    }
  };

  // Calculate counts
  const pendingCount = approvals.filter(a => a.status === 'Pending').length;
  const returnedCount = approvals.filter(a => a.status === 'Returned').length;
  const approvedCount = approvals.filter(a => a.status === 'Approved').length;

  // Apply filter
  const filteredApprovals = filterStatus === 'All' 
    ? approvals 
    : approvals.filter(a => a.status === filterStatus);

  return (
    <section className="approvals-page" style={{ padding: '2rem' }}>
      <div className="section-heading" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', margin: 0, color: '#0f172a' }}>Approvals (List)</h2>
        <span style={{ color: '#64748b', fontSize: '1rem' }}>
          Every quotation that needed, needs, or is going through discount approval
        </span>
      </div>

      {error && <div className="error-message" style={{ color: '#dc2626', marginBottom: '1rem' }}>{error}</div>}

      <div className="status-counters" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          onClick={() => setFilterStatus('Pending')}
          style={{ 
            background: filterStatus === 'Pending' ? '#f59e0b' : '#fef3c7', 
            color: filterStatus === 'Pending' ? '#fff' : '#b45309', 
            border: '2px solid #f59e0b', 
            padding: '0.5rem 1rem', 
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: filterStatus === 'Pending' ? '0 2px 4px rgba(245, 158, 11, 0.2)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          {pendingCount} Pending
        </button>
        <button 
          onClick={() => setFilterStatus('Returned')}
          style={{ 
            background: filterStatus === 'Returned' ? '#ef4444' : '#fee2e2', 
            color: filterStatus === 'Returned' ? '#fff' : '#b91c1c', 
            border: '2px solid #ef4444', 
            padding: '0.5rem 1rem', 
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: filterStatus === 'Returned' ? '0 2px 4px rgba(239, 68, 68, 0.2)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          {returnedCount} Returned
        </button>
        <button 
          onClick={() => setFilterStatus('Approved')}
          style={{ 
            background: filterStatus === 'Approved' ? '#22c55e' : '#dcfce7', 
            color: filterStatus === 'Approved' ? '#fff' : '#15803d', 
            border: '2px solid #22c55e', 
            padding: '0.5rem 1rem', 
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: filterStatus === 'Approved' ? '0 2px 4px rgba(34, 197, 94, 0.2)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          {approvedCount} Approved
        </button>
        <button 
          onClick={() => setFilterStatus('All')}
          style={{ 
            background: filterStatus === 'All' ? '#64748b' : '#f1f5f9', 
            color: filterStatus === 'All' ? '#fff' : '#475569', 
            border: '2px solid #64748b', 
            padding: '0.5rem 1rem', 
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: filterStatus === 'All' ? '0 2px 4px rgba(100, 116, 139, 0.2)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          All
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '1.5rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>Quotation</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>Customer</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>Blended Risk</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>Stage</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>Assigned To</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: '0.95rem' }}>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Loading...</td></tr>
            ) : filteredApprovals.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No approvals found.</td></tr>
            ) : (
              filteredApprovals.map(a => (
                <tr 
                  key={a.id} 
                  style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  onClick={() => setActiveApprovalId(a.id)}
                >
                  <td style={{ padding: '1rem', fontWeight: '500', color: '#0f172a' }}>{a.code}</td>
                  <td style={{ padding: '1rem', color: '#334155' }}>{a.customer_name}</td>
                  <td style={{ padding: '1rem' }}>
                    {a.risk_label && (
                      <span className={`risk-pill risk-${a.risk_label.toLowerCase().replace(' ', '-')}`}>
                        {a.risk_label}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', color: '#334155' }}>{a.current_stage || 'Auto-Approved'}</td>
                  <td style={{ padding: '1rem', color: '#334155' }}>{a.current_stage ? `${a.current_stage} Pool` : '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ background: '#fef9c3', border: '1px solid #fde047', color: '#854d0e', padding: '1rem', borderRadius: '6px', fontSize: '0.9rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        Click any row to open its full approval detail, risk breakdown, and audit trail.
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff', width: 'fit-content' }}>
        <label style={{ fontSize: '0.9rem', color: '#475569', fontWeight: '500', margin: 0 }}>Filter:</label>
        <select 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', color: '#0f172a', background: '#f8fafc', fontSize: '0.9rem', minWidth: '150px' }}
        >
          <option value="Pending">Pending Only</option>
          <option value="Returned">Returned Only</option>
          <option value="Approved">Approved Only</option>
          <option value="All">All Approvals</option>
        </select>
      </div>

      {activeApprovalId && (
        <ApprovalDetail 
          approvalId={activeApprovalId} 
          onClose={() => setActiveApprovalId(null)} 
          onSuccess={() => {
            setActiveApprovalId(null);
            fetchApprovals();
          }} 
        />
      )}
    </section>
  );
}
