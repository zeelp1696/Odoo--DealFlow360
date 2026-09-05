import React, { useState } from 'react';

export default function LoginForm({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const submit = async event => {
    event.preventDefault();
    setError('');
    try { await onLogin(email, password); } catch (exception) { setError(exception.message); }
  };
  return <main className="login-shell"><section className="brand-panel"><span className="eyebrow">B2B revenue operations</span><h1>Make every deal <em>move.</em></h1><p>One governed flow from quotation to payment, with the right people involved at the right moment.</p><div className="flow">QUOTE <b>→</b> APPROVAL <b>→</b> FULFILLMENT <b>→</b> PAYMENT</div></section><form className="login-card" onSubmit={submit}><span className="eyebrow">DF360</span><h2>Welcome back</h2><p className="muted">Sign in to your role workspace.</p><label>Email<input value={email} onChange={event => setEmail(event.target.value)} type="email" autoComplete="username" required /></label><label>Password<div className="password-field"><input value={password} onChange={event => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} autoComplete="current-password" required /><button type="button" className="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(value => !value)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></svg></button></div></label>{error && <div className="error">{error}</div>}<button type="submit">Login <span>↗</span></button><small>Enter your assigned DF360 account.</small></form></main>;
}