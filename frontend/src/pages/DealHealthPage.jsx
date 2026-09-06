import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '../api/client.js';

const FLAG_COLORS = {
  stalled: { bg: '#fef3c7', text: '#b45309', border: '#f59e0b', label: 'Stalled' },
  discount_anomaly: { bg: '#fee2e2', text: '#b91c1c', border: '#ef4444', label: 'Discount Anomaly' },
  delivery_slippage: { bg: '#ede9fe', text: '#6d28d9', border: '#8b5cf6', label: 'Delivery Slippage' },
};

function KpiCard({ title, value, subtitle, color }) {
  return (
    <div style={{
      flex: 1, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px',
      padding: '1.5rem', borderTop: `4px solid ${color}`,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
    }}>
      <div style={{ fontSize: '0.82rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>{title}</div>
      <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>{value}</div>
      {subtitle && <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '0.5rem' }}>{subtitle}</div>}
    </div>
  );
}

export default function DealHealthPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isActing, setIsActing] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet('/deal-health');
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load deal health data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleRow = (key) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (!data?.flags) return;
    const allKeys = data.flags.map(f => `${f.quotation_id}-${f.flag_type}`);
    if (selectedIds.size === allKeys.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allKeys));
    }
  };

  const handleAction = async (action) => {
    if (selectedIds.size === 0) {
      setActionMsg('Please select at least one deal to take action on.');
      setTimeout(() => setActionMsg(''), 3000);
      return;
    }
    setIsActing(true);
    setActionMsg('');
    let success = 0;
    for (const key of selectedIds) {
      const [quotationId, flagType] = key.split('-');
      try {
        await apiPost(`/deal-health/${quotationId}/action`, { action, flag_type: flagType });
        success++;
      } catch (_) { /* continue with others */ }
    }
    setActionMsg(`${action === 'escalate' ? 'Escalated' : 'Nudge sent for'} ${success} deal(s).`);
    setSelectedIds(new Set());
    await fetchData();
    setIsActing(false);
    setTimeout(() => setActionMsg(''), 4000);
  };

  const flags = data?.flags || [];
  const kpis = data?.kpis || { stalled_deals: 0, discount_anomalies: 0, delivery_slippage: 0 };
  const config = data?.config || {};
  const allKeys = flags.map(f => `${f.quotation_id}-${f.flag_type}`);
  const allSelected = allKeys.length > 0 && selectedIds.size === allKeys.length;

  return (
    <section style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', margin: '0 0 0.4rem 0', color: '#0f172a' }}>Deal Health and Anomaly Dashboard</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>
          Real-time flags for stalled deals and unusual discount patterns
        </p>
        {config.stalled_deal_days && (
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
            Thresholds: Stalled = {config.stalled_deal_days} days idle · Anomaly = {config.anomaly_multiplier}× rep average
          </p>
        )}
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <KpiCard
          title="Stalled Deals"
          value={kpis.stalled_deals}
          subtitle={`${config.stalled_deal_days || '?'} days idle threshold (from system config)`}
          color="#f59e0b"
        />
        <KpiCard
          title="Discount Anomalies"
          value={kpis.discount_anomalies}
          subtitle={`>${config.anomaly_multiplier || '?'}× rep's avg discount`}
          color="#ef4444"
        />
        <KpiCard
          title="Delivery Slippage"
          value={kpis.delivery_slippage}
          subtitle="Fulfillment orders in Backorder"
          color="#8b5cf6"
        />
      </div>

      {/* Action Message */}
      {actionMsg && (
        <div style={{ padding: '0.75rem 1rem', background: '#dcfce7', color: '#15803d', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: '500' }}>
          ✓ {actionMsg}
        </div>
      )}

      {/* Flags Table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', marginBottom: '1.5rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '0.83rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '0.9rem 1rem', borderBottom: '1px solid #e2e8f0', width: '40px' }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  title="Select All"
                />
              </th>
              <th style={{ padding: '0.9rem 1rem', borderBottom: '1px solid #e2e8f0' }}>Deal</th>
              <th style={{ padding: '0.9rem 1rem', borderBottom: '1px solid #e2e8f0' }}>Type</th>
              <th style={{ padding: '0.9rem 1rem', borderBottom: '1px solid #e2e8f0' }}>Issue</th>
              <th style={{ padding: '0.9rem 1rem', borderBottom: '1px solid #e2e8f0' }}>Flagged</th>
              <th style={{ padding: '0.9rem 1rem', borderBottom: '1px solid #e2e8f0' }}>Action Taken</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>Loading...</td></tr>
            ) : flags.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✅</div>
                  All deals look healthy! No flags detected.
                </td>
              </tr>
            ) : (
              flags.map((f, i) => {
                const key = `${f.quotation_id}-${f.flag_type}`;
                const isSelected = selectedIds.has(key);
                const colors = FLAG_COLORS[f.flag_type] || FLAG_COLORS.stalled;
                return (
                  <tr
                    key={i}
                    onClick={() => toggleRow(key)}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      background: isSelected ? '#eff6ff' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '1rem' }} onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(key)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: '600', color: '#0f172a' }}>{f.code}</div>
                      <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{f.customer_name}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '700',
                        background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`
                      }}>
                        {colors.label}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: '#334155', fontSize: '0.9rem', maxWidth: '250px' }}>
                      <div style={{ fontWeight: '500' }}>{f.issue}</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>{f.issue_detail}</div>
                    </td>
                    <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                      {f.flagged_at
                        ? new Date(f.flagged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : new Date(f.last_activity_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.88rem', color: f.action_taken ? '#16a34a' : '#94a3b8', fontStyle: f.action_taken ? 'normal' : 'italic' }}>
                      {f.action_taken || 'No action yet'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Selection info bar */}
      {selectedIds.size > 0 && (
        <div style={{ padding: '0.5rem 1rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.88rem', color: '#1d4ed8' }}>
          {selectedIds.size} deal(s) selected — use buttons below to take action
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button
          onClick={() => handleAction('escalate')}
          disabled={isActing || flags.length === 0}
          style={{
            padding: '0.65rem 1.5rem', border: 'none', borderRadius: '6px',
            background: selectedIds.size > 0 ? '#ef4444' : '#fca5a5',
            color: '#fff', fontWeight: '700', cursor: 'pointer', fontSize: '0.95rem',
            opacity: isActing ? 0.6 : 1, transition: 'background 0.15s'
          }}
        >
          Escalate {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
        </button>
        <button
          onClick={() => handleAction('nudge')}
          disabled={isActing || flags.length === 0}
          style={{
            padding: '0.65rem 1.5rem', border: 'none', borderRadius: '6px',
            background: selectedIds.size > 0 ? '#3b82f6' : '#93c5fd',
            color: '#fff', fontWeight: '700', cursor: 'pointer', fontSize: '0.95rem',
            opacity: isActing ? 0.6 : 1, transition: 'background 0.15s'
          }}
        >
          Nudge Rep {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
        </button>
        {selectedIds.size > 0 && (
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{ padding: '0.65rem 1rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', color: '#475569', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            Clear Selection
          </button>
        )}
        <button
          onClick={fetchData}
          disabled={loading}
          style={{ marginLeft: 'auto', padding: '0.65rem 1rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff', color: '#64748b', cursor: 'pointer', fontSize: '0.85rem' }}
        >
          ↻ Refresh
        </button>
      </div>
    </section>
  );
}
