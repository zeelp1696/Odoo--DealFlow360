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
import CustomerPortal from './components/CustomerPortal.jsx';

const API = 'http://localhost:4000/api';
const AuthContext = createContext(null);
const workspaceFor = { admin: 'admin', sales_rep: 'sales', sales_manager: 'sales', finance: 'operations', customer: 'customer' };
const roleLabels = { admin: 'Platform Admin', sales_rep: 'Sales Rep', sales_manager: 'Sales Manager', finance: 'Finance & Operations', customer: 'Customer Portal' };
const dataModules = new Set(['inventory', 'fulfillment', 'subscriptions', 'billing', 'negotiation', 'deal-health', 'reports', 'upsell', 'administration', 'orders', 'support']);

function clearStoredSession() { try { window.localStorage.removeItem('dealflow-session'); } catch { /* Browser storage may be blocked. */ } }
function readStoredSession() { try { const stored = window.localStorage.getItem('dealflow-session'); return stored ? JSON.parse(stored) : null; } catch { clearStoredSession(); return null; } }

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
  
  useEffect(() => { 
    fetch(`${API}/workspaces/${workspace}`, { headers })
      .then(async response => { 
        const body = await response.json(); 
        if (!response.ok) throw new Error(body.message || 'Workspace could not be loaded.'); 
        return body; 
      })
      .then(setData)
      .catch(error => console.error(error.message)); 
  }, [workspace, session.token]);

  if (user.role === 'customer') {
    return <CustomerPortal session={session} user={user} onLogout={logout} />;
  }

  return <main className="app-shell">
    <div className="app-content">
      <div className="portal-header">
        <div className="portal-brand">DF<span>360</span></div>
        <div className="portal-role">{user.name} ({roleLabels[user.role]})</div>
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
        <button className="portal-logout" onClick={logout}>Logout</button>
      </div>
      
      {activeModule === 'overview' && (
        <DashboardOverview user={user} setActiveModule={setActiveModule} stats={data?.stats} setCreateQuotationIntent={setCreateQuotationIntent} />
      )}
    {activeModule === 'quotations' && <QuotationsPage startCreatingNew={createQuotationIntent} clearIntent={() => setCreateQuotationIntent(false)} />}
    {dataModules.has(activeModule) && <ModulePanel session={session} module={activeModule} />}
    {activeModule === 'approvals' && ['admin', 'sales_manager', 'finance'].includes(user.role) && <ApprovalQueue session={session} />}
    {activeModule === 'catalog' && <Catalog user={user} />}
    {activeModule === 'governance' && <Governance user={user} />}</div></main>;
}

function App() { const { session, login } = useContext(AuthContext); return session ? <Dashboard /> : <LoginForm onLogin={login} />; }
class AppErrorBoundary extends React.Component { state = { hasError: false }; static getDerivedStateFromError() { return { hasError: true }; } render() { return this.state.hasError ? <main className="error-screen"><h1>DF360 could not load</h1><p>Refresh the page or reset the local session.</p><button onClick={() => { clearStoredSession(); window.location.assign(window.location.origin); }}>Reset session</button></main> : this.props.children; } }
createRoot(document.getElementById('root')).render(<AppErrorBoundary><AuthProvider><App /></AuthProvider></AppErrorBoundary>);