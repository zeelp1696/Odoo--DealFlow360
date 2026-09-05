import React, { createContext, useContext, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API = 'http://localhost:4000/api';
const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [session, setSession] = useState(() => JSON.parse(localStorage.getItem('dealflow-session') || 'null'));
  const login = async (email, password) => {
    const response = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    localStorage.setItem('dealflow-session', JSON.stringify(data));
    setSession(data);
  };
  const logout = () => { localStorage.removeItem('dealflow-session'); setSession(null); };
  return <AuthContext.Provider value={{ session, login, logout }}>{children}</AuthContext.Provider>;
}

const workspaceFor = { admin: 'admin', sales_rep: 'sales', sales_manager: 'sales', finance: 'operations', customer: 'customer' };
const roleLabels = { admin: 'Platform Admin', sales_rep: 'Sales Rep', sales_manager: 'Sales Manager', finance: 'Finance & Operations', customer: 'Customer Portal' };

function Login() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('sales@dealflow360.local');
  const [password, setPassword] = useState('DealFlow360!24');
  const [error, setError] = useState('');
  const submit = async (event) => { event.preventDefault(); setError(''); try { await login(email, password); } catch (e) { setError(e.message); } };
  return <main className="login-shell"><section className="brand-panel"><span className="eyebrow">B2B revenue operations</span><h1>Make every deal <em>move.</em></h1><p>One governed flow from quotation to payment, with the right people involved at the right moment.</p><div className="flow">QUOTE <b>→</b> APPROVAL <b>→</b> FULFILLMENT <b>→</b> PAYMENT</div></section><form className="login-card" onSubmit={submit}><span className="eyebrow">DealFlow360</span><h2>Welcome back</h2><p className="muted">Sign in to your role workspace.</p><label>Email<input value={email} onChange={e => setEmail(e.target.value)} type="email" required /></label><label>Password<input value={password} onChange={e => setPassword(e.target.value)} type="password" required /></label>{error && <div className="error">{error}</div>}<button type="submit">Enter workspace <span>↗</span></button><small>Demo users share password: DealFlow360!24</small></form></main>;
}

function Dashboard() {
  const { session, logout } = useContext(AuthContext);
  const user = session.user;
  const workspace = workspaceFor[user.role];
  const [data, setData] = useState(null);
  useEffect(() => { fetch(`${API}/workspaces/${workspace}`, { headers: { Authorization: `Bearer ${session.token}` } }).then(r => r.json()).then(setData); }, [workspace, session.token]);
  return <main className="app-shell"><header><div className="logo">DF<span>360</span></div><div className="header-user"><div><strong>{user.name}</strong><small>{roleLabels[user.role]}</small></div><button className="logout" onClick={logout}>Log out</button></div></header><section className="dashboard"><div className="welcome"><span className="eyebrow">Role checkpoint / authenticated</span><h1>{data?.title || 'Loading workspace...'}</h1><p>Access is scoped by the signed JWT role claim. This is the foundation for every DealFlow360 module.</p></div><div className="status-row"><div><small>IDENTITY</small><strong>{user.email}</strong></div><div><small>ROLE</small><strong>{roleLabels[user.role]}</strong></div><div><small>SESSION</small><strong className="live">● Active</strong></div></div><section className="module-grid">{(data?.actions || []).map((action, index) => <article key={action}><span>0{index + 1}</span><h3>{action}</h3><p>{user.role === 'customer' ? 'Restricted customer experience' : 'Available in your role workspace'}</p><button className="ghost">Open module ↗</button></article>)}</section></section></main>;
}

function App() { const { session } = useContext(AuthContext); return session ? <Dashboard /> : <Login />; }
createRoot(document.getElementById('root')).render(<AuthProvider><App /></AuthProvider>);