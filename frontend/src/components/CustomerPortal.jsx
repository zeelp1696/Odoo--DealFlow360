import React, { useEffect, useState } from 'react';
import { confirmCustomerQuote, getCustomerQuote, sendCustomerRequest, updateCustomerProfile } from '../api/customerPortal.js';

export default function CustomerPortal({ session, user, onLogout }) {
  const [portal, setPortal] = useState(null);
  const [tab, setTab] = useState('quote');
  const [comment, setComment] = useState('');
  const [counter, setCounter] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [lineId, setLineId] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [profileName, setProfileName] = useState(user.name);
  const [savedProfileName, setSavedProfileName] = useState(user.name);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const refresh = () => getCustomerQuote(session.token).then(setPortal).catch(exception => setError(exception.message));
  useEffect(() => { refresh(); }, [session.token]);

  const submitRequest = async event => {
    event.preventDefault(); setNotice(''); setError('');
    try {
      await sendCustomerRequest(session.token, portal.quote.id, { quotationLineId: lineId || null, comment, counterDiscountPercent: Number(counter), requestedDeliveryDate: deliveryDate });
      setComment(''); setCounter(''); setDeliveryDate(''); setLineId(''); setNotice('Request sent to the DF360 team.'); await refresh();
    } catch (exception) { setError(exception.message); }
  };

  const confirm = async () => {
    setNotice(''); setError('');
    try { const result = await confirmCustomerQuote(session.token, portal.quote.id); setNotice(result.requiresApproval ? 'Terms exceed the configured threshold and have re-entered approval.' : 'Quotation confirmed successfully.'); await refresh(); }
    catch (exception) { setError(exception.message); }
  };
  const saveProfile = async event => {
    event.preventDefault(); setNotice(''); setError('');
    try { const result = await updateCustomerProfile(session.token, profileName); setProfileName(result.user.name); setSavedProfileName(result.user.name); setIsEditingProfile(false); setNotice('Profile name updated successfully.'); }
    catch (exception) { setError(exception.message); }
  };

  if (!portal) return <main className="customer-portal"><div className="portal-loading">Loading your quotation...</div></main>;
  const quote = portal.quote;
  return <main className="customer-portal">
    <header className="portal-header"><div className="portal-brand">DF<span>360</span></div><div className="portal-role">{user.name} (Customer Portal)</div><nav><button className={tab === 'quote' ? 'portal-tab active' : 'portal-tab'} onClick={() => setTab('quote')}>My Quotation</button><button className={tab === 'messages' ? 'portal-tab active' : 'portal-tab'} onClick={() => setTab('messages')}>Messages</button><button className={tab === 'profile' ? 'portal-tab active' : 'portal-tab'} onClick={() => setTab('profile')}>Profile</button></nav><button className="portal-logout" onClick={onLogout}>Log out</button></header>
    <section className="portal-content"><div className="portal-heading"><div><span className="eyebrow">Customer portal</span><h1>Review your quotation</h1><p>Ask questions, request changes, or confirm the final terms directly.</p></div>{quote && <span className="portal-status">Status: {quote.status}</span>}</div>
      {error && <div className="error">{error}</div>}{notice && <div className="portal-notice">{notice}</div>}
      {tab === 'profile' && <section className="portal-card profile-card"><span className="eyebrow">Profile</span><h2>Your details</h2><form className="profile-form" onSubmit={saveProfile}><label>Name<div className="editable-profile-field"><input value={profileName} onChange={event => setProfileName(event.target.value)} maxLength="120" readOnly={!isEditingProfile} required /><button type="button" className="edit-name-button" title={isEditingProfile ? 'Cancel editing' : 'Edit name'} aria-label={isEditingProfile ? 'Cancel editing' : 'Edit name'} onClick={() => { if (isEditingProfile) setProfileName(savedProfileName); setIsEditingProfile(value => !value); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={isEditingProfile ? 'M6 6l12 12M18 6 6 18' : 'm4 16.5-.7 3.7 3.7-.7L18.5 8a2.1 2.1 0 0 0-3-3L4 16.5Z'} />{!isEditingProfile && <path d="m14.5 6.5 3 3" />}</svg></button></div></label><label>Email<input value={user.email} readOnly /></label>{isEditingProfile && <button type="submit">Save changes</button>}</form></section>}
      {tab === 'messages' && <section className="portal-card"><span className="eyebrow">Messages</span><h2>Conversation history</h2>{portal.messages.length ? portal.messages.map(message => <div className="message-row" key={message.id}><strong>{message.sender_role === 'customer' ? 'You' : 'DF360 team'}</strong><span>{message.comment || 'Term request'}</span></div>) : <p className="portal-muted">No messages yet.</p>}</section>}
      {tab === 'quote' && (quote ? <section className="portal-card portal-negotiation"><table className="portal-table"><thead><tr><th>Line</th><th>Customer Comment</th></tr></thead><tbody>{portal.lines.map(line => <tr key={line.id}><td>{line.name}</td><td>{portal.messages.find(message => message.quotation_line_id === line.id)?.comment || 'No question yet'}</td></tr>)}</tbody></table><form className="portal-form" onSubmit={submitRequest}><label><span>Counter Discount % <span className="required-mark">*</span></span><input type="number" min="0" max="100" step="0.01" value={counter} onChange={event => setCounter(event.target.value)} required /></label><label><span>Requested Delivery Date <span className="required-mark">*</span></span><input type="date" value={deliveryDate} onChange={event => setDeliveryDate(event.target.value)} required /></label><label className="portal-comment"><span>Question or request <span className="required-mark">*</span></span><textarea value={comment} onChange={event => setComment(event.target.value)} placeholder="Can this be adjusted?" rows="3" required /></label><div className="portal-actions"><button type="submit" className="portal-secondary">Submit Request</button><button type="button" className="portal-confirm" onClick={confirm} disabled={quote.status === 'Confirmed'}>Confirm Quotation</button></div></form><div className="portal-footnote">Fields marked with * are required. If final terms exceed thresholds, the quotation automatically re-enters approval.</div></section> : <section className="portal-card"><h2>No quotation available yet</h2><p className="portal-muted">Your sales representative has not shared a quotation with this account.</p></section>)}
    </section>
  </main>;
}
