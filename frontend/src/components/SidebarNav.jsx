import React from 'react';
import { navigationByRole } from '../config/navigation.js';

export default function SidebarNav({ role, activeModule, onSelect }) {
  return <aside className="sidebar"><div className="sidebar-brand">DF<span>360</span></div><div className="sidebar-role">{role.replace('_', ' ')}</div><nav>{(navigationByRole[role] || []).map(([id, label]) => <button className={activeModule === id ? 'nav-item active' : 'nav-item'} key={id} onClick={() => onSelect(id)}><span className="nav-mark">{String((navigationByRole[role] || []).findIndex(item => item[0] === id) + 1).padStart(2, '0')}</span>{label}</button>)}</nav></aside>;
}