import React, { createContext, useContext, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import ApprovalQueue from './components/ApprovalQueue.jsx';
import LoginForm from './components/LoginForm.jsx';
import { moduleDescriptions, navigationByRole } from './config/navigation.js';
import ModulePanel from './components/ModulePanel.jsx';
import DashboardOverview from './pages/DashboardOverview.jsx';
import QuotationsPage from './pages/QuotationsPage.jsx';
import QuotationBuilder from './pages/QuotationBuilder.jsx';
import Catalog from './pages/Catalog.jsx';
import Governance from './pages/Governance.jsx';
import Fulfillment from './pages/Fulfillment.jsx';
import Subscriptions from './pages/Subscriptions.jsx';
import Billing from './pages/Billing.jsx';
import DealHealth from './pages/DealHealth.jsx';
import Reports from './pages/Reports.jsx';
import CustomerPortal from './components/CustomerPortal.jsx';
import ApprovalsPage from './pages/ApprovalsPage.jsx';
import FulfillmentPage from './pages/FulfillmentPage.jsx';
import SubscriptionsPage from './pages/SubscriptionsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import DealHealthPage from './pages/DealHealthPage.jsx';
import InvoicesPage from './pages/InvoicesPage.jsx';
import Administration from './pages/Administration.jsx';

const API = 'http://localhost:4000/api';
const AuthContext = createContext(null);
const workspaceFor = { admin: 'admin', sales_rep: 'sales', sales_manager: 'sales', finance: 'operations', customer: 'customer' };
const roleLabels = { admin: 'Platform Admin', sales_rep: 'Sales Rep', sales_manager: 'Sales Manager', finance: 'Finance & Operations', customer: 'Customer Portal' };
const dataModules = new Set(['inventory', 'negotiation', 'upsell', 'orders', 'support', 'payments']);

function clearStoredSession() { try { window.localStorage.removeItem('dealflow-session'); } catch { /* Browser storage may be blocked. */ } }
function readStoredSession() {
  try {
    const stored = window.localStorage.getItem('dealflow-session');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    // Validate shape — token + user.id + user.role required
    if (!parsed || !parsed.token || !parsed.user || !parsed.user.id || !parsed.user.role) {
      clearStoredSession();
      return null;
    }
    return parsed;
  } catch {
    clearStoredSession();
    return null;
  }
}

function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession);
  const login = async (email, password) => { const response = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }); const data = await response.json(); if (!response.ok) throw new Error(data.message); localStorage.setItem('dealflow-session', JSON.stringify(data)); setSession(data); };
  const logout = () => { clearStoredSession(); setSession(null); };
  return <AuthContext.Provider value={{ session, login, logout }}>{children}</AuthContext.Provider>;
}

function Dashboard() {
  const { session, logout, login } = useContext(AuthContext); const user = session.user; const workspace = workspaceFor[user.role]; const headers = { Authorization: `Bearer ${session.token}` };
  const [activeModule, setActiveModule] = useState('overview');
  const [data, setData] = useState(null);
  const [createQuotationIntent, setCreateQuotationIntent] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  
  useEffect(() => { 
    if (activeModule === 'overview') {
      fetch(`${API}/workspaces/${workspace}`, { headers })
        .then(async response => { 
          const body = await response.json(); 
          if (!response.ok) throw new Error(body.message || 'Workspace could not be loaded.'); 
          return body; 
        })
        .then(setData)
        .catch(error => console.error(error.message)); 
    }
  }, [workspace, session.token, activeModule]);

  if (user.role === 'customer') {
    return <CustomerPortal session={session} user={user} onLogout={logout} />;
  }

  const initials = user.name ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';

  const moduleAuth = {
    overview: ['admin', 'sales_rep', 'sales_manager', 'finance'],
    quotations: ['admin', 'sales_rep', 'sales_manager', 'finance'],
    approvals: ['admin', 'sales_manager', 'finance', 'sales_rep'], 
    fulfillment: ['admin', 'finance'],
    subscriptions: ['admin', 'sales_rep', 'sales_manager', 'finance'],
    billing: ['admin', 'sales_rep', 'sales_manager', 'finance'],
    'deal-health': ['admin', 'sales_manager', 'finance'],
    reports: ['admin', 'sales_manager', 'finance'],
    catalog: ['admin'],
    governance: ['admin'],
    administration: ['admin'],
  };

  const isAuthorized = moduleAuth[activeModule]?.includes(user.role) ?? true;

  return <main className="app-shell">
    <div className="app-content">
      <div className="portal-header">
        <div className="portal-brand">DF<span>360</span></div>
        <nav>
          {(navigationByRole[user.role] || []).map(([id, label]) => (
            <button 
              key={id} 
              className={`portal-tab ${activeModule === id ? 'active' : ''}`}
              onClick={() => setActiveModule(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div style={{ position: 'relative', marginLeft: 'auto', flexShrink: 0 }}>
          <button
            onClick={() => setAvatarOpen(v => !v)}
            title={user.name}
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: '#e2b75b',
              border: '2px solid rgba(255,255,255,0.35)',
              color: '#17231f', fontWeight: '800', fontSize: '0.82rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', letterSpacing: '0.03em',
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              transition: 'transform 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {initials}
          </button>
          {avatarOpen && (
            <>
              <div
                onClick={() => setAvatarOpen(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 99 }}
              />
              <div style={{
                position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                background: '#fff', border: '1px solid #e2e8f0',
                borderRadius: '10px', boxShadow: '0 8px 28px rgba(22,68,58,0.15)',
                minWidth: '210px', zIndex: 100, overflow: 'hidden',
              }}>
                <div style={{ padding: '1rem 1.1rem 0.85rem', borderBottom: '1px solid #e4e9e1', background: '#f1f4ee' }}>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#16443a', marginBottom: '0.2rem' }}>
                    {user.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '500' }}>
                    {roleLabels[user.role]}
                  </div>
                </div>
                <button
                  onClick={() => { setAvatarOpen(false); logout(); }}
                  style={{
                    width: '100%', padding: '0.75rem 1.1rem', border: 'none',
                    background: 'transparent', textAlign: 'left', cursor: 'pointer',
                    fontSize: '0.88rem', color: '#dc2626', fontWeight: '600',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={!isAuthorized ? { filter: 'blur(8px)', opacity: 0.6, pointerEvents: 'none', userSelect: 'none', flex: 1, display: 'flex', flexDirection: 'column' } : { flex: 1, display: 'flex', flexDirection: 'column' }}>
          {activeModule === 'overview' && (
            <DashboardOverview user={user} setActiveModule={setActiveModule} stats={data?.stats} setCreateQuotationIntent={setCreateQuotationIntent} />
          )}
          {activeModule === 'quotations' && <QuotationsPage startCreatingNew={createQuotationIntent} clearIntent={() => setCreateQuotationIntent(false)} />}
          {activeModule === 'approvals' && <ApprovalsPage />}
          {activeModule === 'fulfillment' && <FulfillmentPage user={user} />}
          {activeModule === 'subscriptions' && <SubscriptionsPage user={user} />}
          {activeModule === 'reports' && <ReportsPage user={user} />}
          {activeModule === 'deal-health' && <DealHealthPage user={user} />}
          {activeModule === 'billing' && <InvoicesPage />}
          {activeModule === 'administration' && <Administration user={user} />}
          {dataModules.has(activeModule) && <ModulePanel session={session} module={activeModule} />}
          {activeModule === 'catalog' && <Catalog user={user} />}
          {activeModule === 'governance' && <Governance user={user} />}
          {createQuotationIntent && <QuotationBuilder onClose={() => setCreateQuotationIntent(false)} onSuccess={() => { setCreateQuotationIntent(false); setActiveModule('quotations'); }} />}
        </div>
        
        {!isAuthorized && (
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 50, background: 'rgba(255, 255, 255, 0.95)', padding: '2.5rem', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', textAlign: 'center', width: '90%', maxWidth: '400px', border: '1px solid rgba(226, 183, 91, 0.3)' }}>
            <div style={{ background: '#fef3c7', color: '#b45309', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '24px' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
            <h3 style={{ margin: '0 0 0.5rem', color: '#1e293b', fontSize: '1.25rem' }}>Access Restricted</h3>
            <p style={{ margin: 0, color: '#64748b', lineHeight: '1.5' }}>You do not have permission to view or interact with this module. Please contact your platform administrator if you believe this is an error.</p>
          </div>
        )}
      </div>
    </div></main>;
}

function App() { const { session, login } = useContext(AuthContext); return session ? <Dashboard /> : <LoginForm onLogin={login} />; }
class AppErrorBoundary extends React.Component { state = { hasError: false }; static getDerivedStateFromError() { return { hasError: true }; } render() { return this.state.hasError ? <main className="error-screen"><h1>DF360 could not load</h1><p>Refresh the page or reset the local session.</p><button onClick={() => { clearStoredSession(); window.location.assign(window.location.origin); }}>Reset session</button></main> : this.props.children; } }
createRoot(document.getElementById('root')).render(<AppErrorBoundary><AuthProvider><App /></AuthProvider></AppErrorBoundary>);