import React, { useEffect, useState } from 'react';
import { getModuleData } from '../api/modules.js';

export default function ModulePanel({ session, module }) {
  const [data, setData] = useState(null); const [error, setError] = useState('');
  useEffect(() => { setData(null); setError(''); getModuleData(session.token, module).then(setData).catch(exception => setError(exception.message)); }, [session.token, module]);
  if (error) return <section className="module-panel"><div className="error">{error}</div></section>;
  if (!data) return <section className="module-panel"><div className="empty-panel">Loading module data...</div></section>;
  const columns = data.rows[0] ? Object.keys(data.rows[0]) : [];
  return <section className="module-panel"><div className="section-heading"><div><span className="eyebrow">Live module</span><h2>{data.title}</h2></div><span className="data-count">{data.rows.length} records</span></div>{data.rows.length ? <div className="module-table"><div className="module-table-head">{columns.map(column => <small key={column}>{column.replaceAll('_', ' ')}</small>)}</div>{data.rows.map((row, index) => <div className="module-table-row" key={index}>{columns.map(column => <span key={column}>{String(row[column] ?? '—')}</span>)}</div>)}</div> : <div className="empty-panel">No records yet. This module is connected and ready for the next workflow action.</div>}</section>;
}