import React, { useState, useEffect, useCallback } from 'react';
import { apiGet } from '../api/client.js';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function StatCard({ title, value, subtitle, color = '#3b82f6' }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px',
      padding: '1.5rem', flex: 1, minWidth: '200px',
      borderTop: `4px solid ${color}`,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
    }}>
      <div style={{ fontSize: '0.82rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>{title}</div>
      <div style={{ fontSize: '2.2rem', fontWeight: '700', color: '#0f172a', lineHeight: 1 }}>{value ?? '—'}</div>
      {subtitle && <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '0.5rem' }}>{subtitle}</div>}
    </div>
  );
}

function FilterBar({ filters, setFilters }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
      {[
        { label: 'Period', key: 'period', options: [{ value: '', label: 'All Time' }, { value: 'this_month', label: 'This Month' }, { value: 'last_month', label: 'Last Month' }, { value: 'this_year', label: 'This Year' }] },
        { label: 'Approval Status', key: 'approval_status', options: [{ value: '', label: 'All Statuses' }, { value: 'Draft', label: 'Draft' }, { value: 'Pending Approval', label: 'Pending Approval' }, { value: 'Approved', label: 'Approved' }, { value: 'Rejected', label: 'Rejected' }, { value: 'Negotiation', label: 'Negotiation' }] },
      ].map(f => (
        <div key={f.key}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</label>
          <select
            value={filters[f.key] || ''}
            onChange={e => setFilters(prev => ({ ...prev, [f.key]: e.target.value }))}
            style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff', color: '#0f172a', fontSize: '0.9rem' }}
          >
            {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      ))}
      <div>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sales Team</label>
        <input
          placeholder="Filter by team..."
          value={filters.sales_team || ''}
          onChange={e => setFilters(prev => ({ ...prev, sales_team: e.target.value }))}
          style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff', color: '#0f172a', fontSize: '0.9rem', boxSizing: 'border-box' }}
        />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Product</label>
        <input
          placeholder="Filter by product..."
          value={filters.product || ''}
          onChange={e => setFilters(prev => ({ ...prev, product: e.target.value }))}
          style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff', color: '#0f172a', fontSize: '0.9rem', boxSizing: 'border-box' }}
        />
      </div>
    </div>
  );
}

export default function ReportsPage({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ period: '', approval_status: '', sales_team: '', product: '' });
  const [isExporting, setIsExporting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filters.period) params.append('period', filters.period);
      if (filters.approval_status) params.append('approval_status', filters.approval_status);
      if (filters.product) params.append('product', filters.product);
      const res = await apiGet(`/reports?${params.toString()}`);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async (format) => {
    setIsExporting(true);
    try {
      const session = JSON.parse(localStorage.getItem('dealflow-session') || '{}');
      const token = session.token;
      const params = new URLSearchParams({ format });
      if (filters.period) params.append('period', filters.period);
      if (filters.product) params.append('product', filters.product);

      const response = await fetch(`${BASE_URL}/reports/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dealflow360-report-${new Date().toISOString().slice(0, 10)}.${format === 'pdf' ? 'pdf' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Export failed: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Admin-only guard
  if (user?.role !== 'admin') {
    return (
      <section style={{ padding: '3rem', textAlign: 'center' }}>
        <h2 style={{ color: '#94a3b8' }}>Access Restricted</h2>
        <p style={{ color: '#64748b' }}>The Reports Dashboard is for Platform Admins only.</p>
      </section>
    );
  }

  const riskColors = { HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#22c55e' };

  return (
    <section style={{ padding: '2rem' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', margin: '0 0 0.4rem 0', color: '#0f172a' }}>Admin / Reporting Dashboard</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>Sales trends, approval bottlenecks and platform usage</p>
      </div>

      {/* Filters */}
      <FilterBar filters={filters} setFilters={setFilters} />

      {error && (
        <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '1.1rem' }}>Loading reports...</div>
      ) : (
        <>
          {/* Top KPI Cards */}
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <StatCard
              title="Quotes Created"
              value={data?.stats?.quotes_created}
              subtitle={filters.period === 'this_month' ? 'This month' : filters.period === 'this_year' ? 'This year' : 'All time'}
              color="#3b82f6"
            />
            <StatCard
              title="Avg Approval Time"
              value={data?.stats?.avg_approval_hours != null ? `${data.stats.avg_approval_hours}h` : 'N/A'}
              subtitle="From submission to first decision"
              color="#f59e0b"
            />
            <StatCard
              title="Top Upsold Plan"
              value={data?.stats?.top_upsold_plan}
              subtitle="Most active subscription"
              color="#22c55e"
            />
          </div>

          {/* Two Column Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            
            {/* Status Breakdown */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', color: '#0f172a', fontWeight: '600' }}>Quotation Status Breakdown</h3>
              {data?.status_breakdown && Object.entries(data.status_breakdown).map(([key, val]) => {
                const label = key.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
                const total = parseInt(data.stats.quotes_created) || 1;
                const pct = Math.round((parseInt(val) / total) * 100);
                return (
                  <div key={key} style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.9rem', color: '#334155' }}>{label}</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#0f172a' }}>{val}</span>
                    </div>
                    <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#3b82f6', borderRadius: '3px', transition: 'width 0.4s' }}></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Risk Distribution */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', color: '#0f172a', fontWeight: '600' }}>Risk Distribution</h3>
              {(data?.risk_distribution || []).length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No risk data available.</p>
              ) : (
                (data?.risk_distribution || []).map(r => (
                  <div key={r.risk_label} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                    <span style={{
                      padding: '0.2rem 0.8rem', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '700',
                      background: `${riskColors[r.risk_label]}22`, color: riskColors[r.risk_label] || '#64748b'
                    }}>
                      {r.risk_label}
                    </span>
                    <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>{r.count}</span>
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>quotations</span>
                  </div>
                ))
              )}
            </div>

            {/* Top Products */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', color: '#0f172a', fontWeight: '600' }}>Top Products in Quotations</h3>
              {(data?.top_products || []).length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No product data.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                      <th style={{ textAlign: 'left', padding: '0.5rem 0', color: '#64748b', fontWeight: '600' }}>Product</th>
                      <th style={{ textAlign: 'right', padding: '0.5rem 0', color: '#64748b', fontWeight: '600' }}>Appearances</th>
                      <th style={{ textAlign: 'right', padding: '0.5rem 0', color: '#64748b', fontWeight: '600' }}>Total Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.top_products || []).map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '0.6rem 0', color: '#0f172a' }}>{p.name}</td>
                        <td style={{ padding: '0.6rem 0', textAlign: 'right', color: '#334155' }}>{p.appearances}</td>
                        <td style={{ padding: '0.6rem 0', textAlign: 'right', color: '#334155' }}>{p.total_qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Rep Activity */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', color: '#0f172a', fontWeight: '600' }}>Rep Activity</h3>
              {(data?.rep_activity || []).length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No rep data.</p>
              ) : (
                (data?.rep_activity || []).map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f8fafc' }}>
                    <div>
                      <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#0f172a' }}>{r.rep_name}</span>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'capitalize' }}>({r.role.replace('_', ' ')})</span>
                    </div>
                    <span style={{ fontWeight: '700', color: '#3b82f6' }}>{r.quote_count} quotes</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Monthly Trend */}
          {(data?.monthly_trend || []).length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.5rem', marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', color: '#0f172a', fontWeight: '600' }}>Monthly Quote Volume (Last 6 Months)</h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', height: '120px' }}>
                {data.monthly_trend.map((m, i) => {
                  const maxCount = Math.max(...data.monthly_trend.map(x => parseInt(x.count)), 1);
                  const height = Math.max((parseInt(m.count) / maxCount) * 100, 4);
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#334155' }}>{m.count}</span>
                      <div style={{ width: '100%', height: `${height}px`, background: '#3b82f6', borderRadius: '4px 4px 0 0', transition: 'height 0.4s' }}></div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{m.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Export Buttons */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>Download Report:</span>
            <button
              onClick={() => handleExport('csv')}
              disabled={isExporting}
              style={{ padding: '0.65rem 1.5rem', border: '2px solid #3b82f6', borderRadius: '6px', background: '#3b82f6', color: '#fff', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem', opacity: isExporting ? 0.6 : 1, transition: 'all 0.15s' }}
            >
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </button>
            <button
              onClick={() => handleExport('xls')}
              disabled={isExporting}
              style={{ padding: '0.65rem 1.5rem', border: '2px solid #1d4ed8', borderRadius: '6px', background: '#fff', color: '#1d4ed8', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem', opacity: isExporting ? 0.6 : 1, transition: 'all 0.15s' }}
            >
              Export XLS
            </button>
          </div>
        </>
      )}
    </section>
  );
}
