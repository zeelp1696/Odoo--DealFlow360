import React, { useEffect, useState } from 'react';
import {
  confirmCustomerQuote,
  getCustomerQuotes,
  getCustomerQuoteDetails,
  sendCustomerRequest,
  updateCustomerProfile,
} from '../api/customerPortal.js';

export default function CustomerPortal({ session, user, onLogout }) {
  const [quotes, setQuotes] = useState([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState(null);
  const [portal, setPortal] = useState(null); // { quote, lines, messages }
  const [tab, setTab] = useState('quotes'); // 'quotes' | 'detail' | 'profile'

  const [comment, setComment] = useState('');
  const [counter, setCounter] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');

  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const safeUserName = user?.name ?? '';
  const [profileName, setProfileName] = useState(safeUserName);
  const [savedProfileName, setSavedProfileName] = useState(safeUserName);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
  // ── Load quotes list ──────────────────────────────────────────
  const loadQuotes = () => {
    setLoading(true);
    getCustomerQuotes(session.token)
      .then(data => { setQuotes(data.quotes || []); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  };

  useEffect(() => { loadQuotes(); }, [session.token]);

  // ── Load a specific quotation detail ─────────────────────────
  const openQuote = (id) => {
    setSelectedQuoteId(id);
    setPortal(null);
    setNotice('');
    setError('');
    setDetailLoading(true);
    setTab('detail');
    getCustomerQuoteDetails(session.token, id)
      .then(data => { setPortal(data); setDetailLoading(false); })
      .catch(err => { setError(err.message); setDetailLoading(false); });
  };

  const refreshDetail = () => {
    if (!selectedQuoteId) return;
    getCustomerQuoteDetails(session.token, selectedQuoteId)
      .then(data => setPortal(data))
      .catch(err => setError(err.message));
  };

  // ── Submit counter-offer / request ───────────────────────────
  const submitRequest = async (e) => {
    e.preventDefault();
    setNotice(''); setError(''); setSubmitting(true);
    try {
      const result = await sendCustomerRequest(session.token, portal.quote.id, {
        comment,
        counterDiscountPercent: counter ? Number(counter) : null,
        requestedDeliveryDate: deliveryDate || null,
      });
      setComment(''); setCounter(''); setDeliveryDate('');
      setNotice(result.reEnteredApproval
        ? '⚠️ Your counter-offer exceeds the threshold and has been sent for approval.'
        : '✅ Your request has been sent to the DF360 team.');
      await refreshDetail();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Confirm quotation ─────────────────────────────────────────
  const confirmQuote = async () => {
    setNotice(''); setError('');
    try {
      const result = await confirmCustomerQuote(session.token, portal.quote.id);
      setNotice(result.requiresApproval
        ? '⚠️ Terms re-entered approval.'
        : '✅ Quotation confirmed successfully!');
      await refreshDetail();
      loadQuotes();
    } catch (err) {
      setError(err.message);
    }
  };

  // ── Save profile ──────────────────────────────────────────────
  const saveProfile = async (e) => {
    e.preventDefault(); setNotice(''); setError('');
    try {
      const result = await updateCustomerProfile(session.token, profileName);
      setProfileName(result.user.name);
      setSavedProfileName(result.user.name);
      setIsEditingProfile(false);
      setNotice('✅ Profile updated.');
    } catch (err) { setError(err.message); }
  };

  // ── Status badge colour ───────────────────────────────────────
  const statusColor = (status) => ({
    Approved: '#16a34a', Negotiation: '#d97706', Confirmed: '#2563eb',
    Rejected: '#dc2626', Draft: '#64748b', 'Pending Approval': '#9333ea',
  }[status] || '#64748b');

  // ── Render ────────────────────────────────────────────────────
  if (loading) return (
    <main className="customer-portal">
      <div className="portal-loading">Loading your quotations…</div>
    </main>
  );

  const quote = portal?.quote ?? null;

  return (
    <main className="customer-portal">
      {/* ── Header ── */}
      <header className="portal-header" style={{ position: 'relative' }}>
        <div className="portal-brand">DF<span>360</span></div>
        <div className="portal-role">{user.name} · Customer Portal</div>
        <nav>
          <button
            className={tab === 'quotes' ? 'portal-tab active' : 'portal-tab'}
            onClick={() => { setTab('quotes'); setSelectedQuoteId(null); setPortal(null); setNotice(''); setError(''); }}
          >My Quotations</button>
          {selectedQuoteId && (
            <button
              className={tab === 'detail' ? 'portal-tab active' : 'portal-tab'}
              onClick={() => setTab('detail')}
            >Quotation Detail</button>
          )}
          <button
            className={tab === 'profile' ? 'portal-tab active' : 'portal-tab'}
            onClick={() => setTab('profile')}
          >Profile</button>
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
                    Customer Portal
                  </div>
                </div>
                <button
                  onClick={() => { setAvatarOpen(false); onLogout(); }}
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
      </header>

      <section className="portal-content">
        {/* ── Notices ── */}
        {error && (
          <div style={{ marginBottom: '1rem', padding: '0.875rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontWeight: 500 }}>
            {error}
          </div>
        )}
        {notice && (
          <div style={{ marginBottom: '1rem', padding: '0.875rem 1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#15803d', fontWeight: 500 }}>
            {notice}
          </div>
        )}

        {/* ════════════════════════════════════════════
            TAB: QUOTES LIST
        ════════════════════════════════════════════ */}
        {tab === 'quotes' && (
          <section className="portal-card">
            <span className="eyebrow">Customer portal</span>
            <h1 style={{ margin: '0.25rem 0 0.5rem', fontSize: '1.6rem' }}>Your Quotations</h1>
            <p style={{ margin: '0 0 1.5rem', color: '#64748b' }}>
              Select a quotation to review terms, see the conversation history, or submit a counter-offer.
            </p>

            {quotes.length === 0 ? (
              <p className="portal-muted">No quotations have been shared with you yet.</p>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {quotes.map(q => (
                  <div
                    key={q.id}
                    onClick={() => openQuote(q.id)}
                    style={{
                      padding: '1rem 1.25rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#fff',
                      cursor: 'pointer',
                      transition: 'box-shadow 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = '#c9d6e3'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b', marginBottom: '0.2rem' }}>{q.code}</div>
                      <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        {new Date(q.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{
                        padding: '0.2rem 0.65rem',
                        borderRadius: '999px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        letterSpacing: '0.02em',
                        background: statusColor(q.status) + '20',
                        color: statusColor(q.status),
                        border: `1px solid ${statusColor(q.status)}40`,
                      }}>{q.status}</span>
                      <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>View →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ════════════════════════════════════════════
            TAB: QUOTATION DETAIL
        ════════════════════════════════════════════ */}
        {tab === 'detail' && (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <button className="portal-secondary" onClick={() => { setTab('quotes'); }}>
                ← Back to Quotations
              </button>
            </div>

            {detailLoading && (
              <section className="portal-card">
                <div className="portal-loading">Loading quotation details…</div>
              </section>
            )}

            {!detailLoading && portal && quote && (
              <>
                {/* ── Quote header ── */}
                <div className="portal-heading" style={{ marginBottom: '1.5rem' }}>
                  <div>
                    <span className="eyebrow">{quote.code}</span>
                    <h1 style={{ margin: '0.15rem 0 0', fontSize: '1.5rem' }}>Quotation Details</h1>
                  </div>
                  <span style={{
                    padding: '0.3rem 0.9rem',
                    borderRadius: '999px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    background: statusColor(quote.status) + '20',
                    color: statusColor(quote.status),
                    border: `1px solid ${statusColor(quote.status)}40`,
                    alignSelf: 'flex-start',
                  }}>{quote.status}</span>
                </div>

                {/* ── Product lines table ── */}
                <section className="portal-card portal-negotiation" style={{ marginBottom: '1.5rem' }}>
                  <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700 }}>Product Lines</h2>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="portal-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th style={{ textAlign: 'right' }}>Qty</th>
                          <th style={{ textAlign: 'right' }}>Unit Price</th>
                          <th style={{ textAlign: 'right' }}>Discount</th>
                          <th style={{ textAlign: 'right' }}>Max Allowed</th>
                          <th style={{ textAlign: 'right' }}>Line Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portal.lines.map(line => {
                          const total = Number(line.unit_price) * Number(line.quantity) * (1 - Number(line.discount_percent) / 100);
                          const overLimit = Number(line.discount_percent) > Number(line.allowed_limit_percent);
                          return (
                            <tr key={line.id}>
                              <td style={{ fontWeight: 600 }}>{line.name}</td>
                              <td style={{ textAlign: 'right' }}>{line.quantity}</td>
                              <td style={{ textAlign: 'right' }}>${Number(line.unit_price).toLocaleString()}</td>
                              <td style={{ textAlign: 'right', color: overLimit ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
                                {line.discount_percent}%
                                {overLimit && <span style={{ fontSize: '0.7rem', marginLeft: '4px' }}>⚠️</span>}
                              </td>
                              <td style={{ textAlign: 'right', color: '#64748b' }}>{line.allowed_limit_percent}%</td>
                              <td style={{ textAlign: 'right', fontWeight: 700 }}>${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'right', fontWeight: 700, paddingTop: '0.75rem', borderTop: '2px solid #e2e8f0' }}>Order Total</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '1.05rem', paddingTop: '0.75rem', borderTop: '2px solid #e2e8f0', color: '#16443a' }}>
                            ${portal.lines.reduce((sum, line) => sum + Number(line.unit_price) * Number(line.quantity) * (1 - Number(line.discount_percent) / 100), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </section>

                {/* ── Conversation / Counter-offer history ── */}
                <section className="portal-card" style={{ marginBottom: '1.5rem' }}>
                  <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700 }}>Negotiation History</h2>
                  {portal.messages.length === 0 ? (
                    <p className="portal-muted">No messages yet. Submit a request below to start negotiating.</p>
                  ) : (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      {portal.messages.map(msg => {
                        const isCustomer = msg.sender_role === 'customer';
                        return (
                          <div key={msg.id} style={{
                            padding: '0.875rem 1rem',
                            borderRadius: '8px',
                            background: isCustomer ? '#f0fdf4' : '#eff6ff',
                            borderLeft: `4px solid ${isCustomer ? '#16a34a' : '#2563eb'}`,
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                              <strong style={{ fontSize: '0.88rem', color: isCustomer ? '#15803d' : '#1d4ed8' }}>
                                {isCustomer ? '👤 You' : '🏢 DF360 Team'}
                              </strong>
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                {new Date(msg.created_at).toLocaleString()}
                              </span>
                            </div>
                            {msg.comment && <div style={{ marginBottom: '0.35rem', color: '#1e293b' }}>{msg.comment}</div>}
                            {msg.counter_discount_percent != null && (
                              <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.25rem' }}>
                                <span style={{ fontWeight: 600 }}>Counter discount:</span> {msg.counter_discount_percent}%
                              </div>
                            )}
                            {msg.requested_delivery_date && (
                              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                                <span style={{ fontWeight: 600 }}>Requested delivery:</span> {new Date(msg.requested_delivery_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* ── Counter-offer form (only if quote is in Negotiation or Approved) ── */}
                {['Approved', 'Negotiation'].includes(quote.status) && (
                  <section className="portal-card portal-negotiation" style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>Submit a Request or Counter-Offer</h2>
                    <p style={{ margin: '0 0 1rem', color: '#64748b', fontSize: '0.88rem' }}>
                      Request changes, propose a different discount, or ask questions. Your message will go to the DF360 sales team.
                    </p>
                    <form className="portal-form" onSubmit={submitRequest}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <label>
                          <span>Counter Discount % <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>(optional)</span></span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={counter}
                            onChange={e => setCounter(e.target.value)}
                            placeholder="e.g. 12"
                          />
                        </label>
                        <label>
                          <span>Requested Delivery Date <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>(optional)</span></span>
                          <input
                            type="date"
                            value={deliveryDate}
                            onChange={e => setDeliveryDate(e.target.value)}
                          />
                        </label>
                      </div>
                      <label className="portal-comment">
                        <span>Message / Question <span className="required-mark">*</span></span>
                        <textarea
                          value={comment}
                          onChange={e => setComment(e.target.value)}
                          placeholder="e.g. Can we get 12% discount on the laptop line?"
                          rows="3"
                          required
                        />
                      </label>
                      <div className="portal-actions">
                        <button type="submit" className="portal-secondary" disabled={submitting}>
                          {submitting ? 'Sending…' : 'Send Request'}
                        </button>
                        <button
                          type="button"
                          className="portal-confirm"
                          onClick={confirmQuote}
                          disabled={quote.status === 'Confirmed'}
                        >
                          ✓ Confirm Quotation
                        </button>
                      </div>
                    </form>
                    <div className="portal-footnote">
                      Confirming the quotation accepts all current terms. If terms exceed approval thresholds, it will re-enter the approval queue.
                    </div>
                  </section>
                )}

                {/* Confirmed state message */}
                {quote.status === 'Confirmed' && (
                  <section className="portal-card" style={{ textAlign: 'center', padding: '2rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</div>
                    <h2 style={{ margin: '0 0 0.5rem' }}>Quotation Confirmed</h2>
                    <p className="portal-muted">This quotation has been accepted. Your DF360 team will proceed with fulfillment.</p>
                  </section>
                )}

                {/* Rejected state message */}
                {quote.status === 'Rejected' && (
                  <section className="portal-card" style={{ textAlign: 'center', padding: '2rem', background: '#fef2f2' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>❌</div>
                    <h2 style={{ margin: '0 0 0.5rem', color: '#dc2626' }}>Quotation Rejected</h2>
                    <p className="portal-muted">This quotation was not approved. Please contact your sales representative.</p>
                  </section>
                )}
              </>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════
            TAB: PROFILE
        ════════════════════════════════════════════ */}
        {tab === 'profile' && (
          <section className="portal-card profile-card">
            <span className="eyebrow">Profile</span>
            <h2>Your details</h2>
            <form className="profile-form" onSubmit={saveProfile}>
              <label>
                Name
                <div className="editable-profile-field">
                  <input
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    maxLength="120"
                    readOnly={!isEditingProfile}
                    required
                  />
                  <button
                    type="button"
                    className="edit-name-button"
                    title={isEditingProfile ? 'Cancel editing' : 'Edit name'}
                    onClick={() => { if (isEditingProfile) setProfileName(savedProfileName); setIsEditingProfile(v => !v); }}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d={isEditingProfile ? 'M6 6l12 12M18 6 6 18' : 'm4 16.5-.7 3.7 3.7-.7L18.5 8a2.1 2.1 0 0 0-3-3L4 16.5Z'} />
                      {!isEditingProfile && <path d="m14.5 6.5 3 3" />}
                    </svg>
                  </button>
                </div>
              </label>
              <label>Email<input value={user.email} readOnly /></label>
              {isEditingProfile && <button type="submit">Save changes</button>}
            </form>
          </section>
        )}
      </section>
    </main>
  );
}
