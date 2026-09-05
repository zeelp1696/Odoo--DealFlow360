import React from 'react';

export default function DashboardOverview({ user, setActiveModule, stats }) {
  if (user.role === 'customer') {
    return (
      <section className="dashboard-light">
        <div className="welcome">
          <span className="eyebrow">Module checkpoint / restricted portal</span>
          <h1>Customer Portal</h1>
          <p>Your portal is isolated from internal catalog and operational data.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-light">
      <div className="welcome" style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0', color: '#17231f', fontWeight: 600 }}>Sales Dashboard</h1>
        <p style={{ margin: 0, color: '#64736a', fontSize: '1.05rem' }}>Central hub for all your deal flow activity.</p>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h2 style={{ fontSize: '2.5rem', margin: 0, color: '#16443a', fontWeight: 700 }}>{stats?.pendingApprovals ?? 0}</h2>
          <p style={{ margin: 0, fontSize: '1rem', color: '#64736a', fontWeight: 500 }}>Pending Approvals</p>
        </div>
        <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h2 style={{ fontSize: '2.5rem', margin: 0, color: '#16443a', fontWeight: 700 }}>{stats?.openQuotations ?? 0}</h2>
          <p style={{ margin: 0, fontSize: '1rem', color: '#64736a', fontWeight: 500 }}>Open Quotations</p>
        </div>
        <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h2 style={{ fontSize: '2.5rem', margin: 0, color: '#16443a', fontWeight: 700 }}>{stats?.atRiskDeals ?? 0}</h2>
          <p style={{ margin: 0, fontSize: '1rem', color: '#64736a', fontWeight: 500 }}>At-Risk Deals</p>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '3.5rem' }}>
        <button className="btn-gold" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }} onClick={() => setActiveModule('quotations')}>+ New Quotation</button>
        <button className="btn-outline" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }} onClick={() => setActiveModule('approvals')}>View Approvals</button>
      </div>

      <div className="dashboard-card" style={{ padding: '2rem' }}>
        <h3 style={{ color: '#16443a', margin: '0 0 1.5rem 0', fontWeight: 600, fontSize: '1.2rem', borderBottom: '1px solid #e8eee9', paddingBottom: '1rem' }}>Recent Activity</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {(!stats?.recentActivity || stats.recentActivity.length === 0) ? (
            <li style={{ color: '#64736a', fontSize: '0.95rem' }}>No recent activity logs.</li>
          ) : (
            stats.recentActivity.map((log, index) => {
              const timeString = new Date(log.timestamp).toLocaleString(undefined, {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
              });
              return (
                <li key={index} style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.95rem', color: '#17231f' }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#e2b75b', flexShrink: 0 }}></span>
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.action}</span>
                  <span style={{ color: '#64736a', fontSize: '0.85rem', flexShrink: 0 }}>{timeString}</span>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </section>
  );
}
