import React, { useState, useEffect } from 'react';
import { getQuotations } from '../api/quotationsApi.js';
import QuotationBuilder from './QuotationBuilder.jsx';

export default function QuotationsPage({ startCreatingNew, clearIntent }) {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  useEffect(() => {
    fetchQuotations();
  }, []);

  useEffect(() => {
    if (startCreatingNew) {
      setIsCreatingNew(true);
      if (clearIntent) clearIntent();
    }
  }, [startCreatingNew, clearIntent]);

  const fetchQuotations = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getQuotations();
      setQuotations(data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch quotations');
    } finally {
      setLoading(false);
    }
  };

  const COLUMNS = ['Draft', 'Pending Approval', 'Approved', 'Negotiation', 'Confirmed'];

  const renderBoard = () => {
    if (loading) return <div className="kanban-loading">Loading quotations...</div>;
    if (error) return <div className="kanban-error">{error}</div>;

    return (
      <div className="kanban-board">
        {COLUMNS.map(colName => {
          const colQuotations = quotations.filter(q => q.status === colName);
          return (
            <div key={colName} className="kanban-column">
              <h3 className="kanban-column-title">{colName}</h3>
              <div className="kanban-cards">
                {colQuotations.map(q => (
                  <div key={q.id} className="kanban-card" onClick={() => console.log('View quotation:', q.id)}>
                    <div className="kanban-card-title">{q.customer_name || 'Unknown Customer'}</div>
                    <div className="kanban-card-subtitle">{q.code}</div>
                    {q.risk_label && (
                      <div className="kanban-card-footer">
                        <span className={`risk-pill risk-${q.risk_label.toLowerCase().replace(' ', '-')}`}>
                          {q.risk_label}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <section className="quotations-page">
      <div className="section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span className="eyebrow">Quotations (List)</span>
          <h2>Every quotation in the system, grouped by status</h2>
        </div>
        <button className="btn-primary" onClick={() => setIsCreatingNew(true)}>
          + New Quotation
        </button>
      </div>

      {renderBoard()}

      {isCreatingNew && (
        <QuotationBuilder 
          onClose={() => setIsCreatingNew(false)} 
          onSuccess={() => {
            setIsCreatingNew(false);
            fetchQuotations();
          }} 
        />
      )}
    </section>
  );
}
