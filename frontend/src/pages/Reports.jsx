import React, { useState, useEffect } from 'react';
import { apiGet } from '../api/client.js';

export default function Reports() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet('/reports/audit')
      .then(res => {
        setLogs(res.logs || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleExport = (type) => {
    const token = JSON.parse(localStorage.getItem('dealflow-session'))?.token;
    fetch(`http://localhost:4000/api/reports/export/${type}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => {
      if (!response.ok) throw new Error('Export failed');
      return response.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `quotations_export.${type}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    })
    .catch(err => alert(`Failed to export ${type.toUpperCase()}: ` + err.message));
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading reports...</div>;
  if (error) return <div className="error" style={{ margin: '2rem' }}>{error}</div>;

  return (
    <section className="mockup-page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="mockup-title">Reporting & Audit Log</div>
          <div className="mockup-subtitle">View system actions and export quotation data.</div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-gold" onClick={() => handleExport('csv')}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Export CSV
          </button>
          <button className="btn-gold" onClick={() => handleExport('xlsx')}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Export XLS
          </button>
          <button className="btn-gold" onClick={() => handleExport('pdf')}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Export PDF
          </button>
        </div>
      </div>

      <div className="mockup-card" style={{ marginTop: '2rem' }}>
        <h3>Approval Audit Trail</h3>
        {logs.length === 0 ? (
          <p style={{ color: '#64736a' }}>No audit logs available yet.</p>
        ) : (
          <table className="mockup-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Quotation</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(log.created_at).toLocaleString()}</td>
                  <td>{log.user_name}</td>
                  <td><strong>{log.action}</strong></td>
                  <td>{log.quotation_code}</td>
                  <td>{log.note || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
