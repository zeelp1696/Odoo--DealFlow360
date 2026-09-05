import React from 'react';
import { navigationByRole } from '../config/navigation.js';

export default function SidebarNav({ role, activeModule, onSelect, user, logout, isOpen, onToggle }) {
  if (!isOpen) {
    return (
      <aside className="sidebar collapsed">
        <button className="sidebar-toggle" onClick={onToggle}>☰</button>
      </aside>
    );
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="sidebar-brand">DF<span>360</span></div>
        <button className="sidebar-toggle-btn" onClick={onToggle}>✕</button>
      </div>
      <div className="sidebar-role">{role.replace('_', ' ')}</div>
      <nav style={{ flex: 1 }}>
        {(navigationByRole[role] || []).map(([id, label]) => (
          <button className={activeModule === id ? 'nav-item active' : 'nav-item'} key={id} onClick={() => onSelect(id)}>
            <span className="nav-mark">{String((navigationByRole[role] || []).findIndex(item => item[0] === id) + 1).padStart(2, '0')}</span>{label}
          </button>
        ))}
      </nav>
      {user && (
        <div className="sidebar-footer">
          <div className="user-info">
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </div>
          <button className="logout-btn" onClick={logout}>Log out</button>
        </div>
      )}
    </aside>
  );
}