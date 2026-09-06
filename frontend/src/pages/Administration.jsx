import React, { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../api/client.js';

export default function Administration({ user }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showAddRole, setShowAddRole] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'sales_rep', password: 'DealFlow360!24' });
  const [formMessage, setFormMessage] = useState('');

  const isAuthorized = user?.role === 'admin';

  const fetchUsers = () => {
    if (!isAuthorized) { setLoading(false); return; }
    apiGet('/administration/users')
      .then(res => {
        setUsers(res.users || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers();
  }, [isAuthorized]);

  const handleAddRole = async (e) => {
    e.preventDefault();
    setFormMessage('');
    try {
      await apiPost('/administration/users', form);
      setFormMessage(`User ${form.name} created successfully.`);
      setForm({ name: '', email: '', role: 'sales_rep', password: 'DealFlow360!24', tier: 'Silver' });
      fetchUsers();
      setShowAddRole(false);
    } catch (err) {
      setFormMessage(err.message);
    }
  };

  const roleLabels = { 
    admin: 'Platform Admin', 
    sales_rep: 'Sales Representative', 
    sales_manager: 'Sales Manager', 
    finance: 'Finance Officer', 
    customer: 'Customer' 
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading users...</div>;
  if (error && isAuthorized) return <div className="error" style={{ margin: '2rem' }}>{error}</div>;

  return (
    <section className="mockup-page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="mockup-title">User & Role Administration</div>
          <div className="mockup-subtitle">Manage users, assign roles, and control access to the platform.</div>
        </div>
        <button className="btn-gold" onClick={() => { setFormMessage(''); setShowAddRole(true); }}>
          + Add User
        </button>
      </div>

      {showAddRole && (
        <div className="mockup-modal-overlay">
          <div className="mockup-modal">
            <h3>Add New Role (User)</h3>
            <form onSubmit={handleAddRole}>
              <div className="mockup-field-row">
                <label>Full Name</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              <div className="mockup-field-row">
                <label>Email Address</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
              </div>
              <div className="mockup-field-row">
                <label>Assign Role</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} required>
                  <option value="sales_rep">Sales Representative</option>
                  <option value="finance">Finance Officer</option>
                  <option value="customer">Customer</option>
                  <option value="sales_manager">Sales Manager</option>
                  <option value="admin">Platform Admin</option>
                </select>
              </div>
              <div className="mockup-field-row">
                <label>Temporary Password</label>
                <input type="text" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
              </div>
              
              {form.role === 'customer' && (
                <div className="mockup-field-row">
                  <label>Customer Tier</label>
                  <select value={form.tier || 'Silver'} onChange={e => setForm({...form, tier: e.target.value})} required>
                    <option value="Gold">Gold</option>
                    <option value="Silver">Silver</option>
                    <option value="Bronze">Bronze</option>
                  </select>
                </div>
              )}
              
              {formMessage && <div className="form-message" style={{marginTop: '1rem', color: '#d93025'}}>{formMessage}</div>}
              
              <div className="form-actions" style={{ display: 'flex', flexDirection: 'row', gap: '1rem', width: '100%', marginTop: '1.5rem' }}>
                <button type="submit" className="btn-gold" style={{ flex: 1, height: '42px', boxSizing: 'border-box' }}>Save User</button>
                <button type="button" className="ghost" style={{ flex: 1, height: '42px', boxSizing: 'border-box', borderRadius: '8px' }} onClick={() => setShowAddRole(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mockup-card" style={{ marginTop: '2rem' }}>
        <h3>System Users</h3>
        <table className="mockup-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Date Added</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td><strong>{u.name}</strong></td>
                <td>{u.email}</td>
                <td>{roleLabels[u.role] || u.role}</td>
                <td>{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
