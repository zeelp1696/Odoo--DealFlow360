import React, { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../api/client.js';

export default function Fulfillment({ user }) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [splits, setSplits] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchOrders = async () => {
    try {
      const data = await apiGet('/fulfillment');
      setOrders(data.orders || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleGenerateSplit = async (orderId) => {
    setIsProcessing(true);
    setError('');
    try {
      const data = await apiPost(`/fulfillment/${orderId}/split`, {});
      setSplits(data.splits);
      alert(`Split generated! Status: ${data.status}`);
      fetchOrders();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedOrder) {
    return (
      <section className="mockup-page-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button className="ghost" onClick={() => { setSelectedOrder(null); setSplits(null); }} style={{ padding: '0.4rem 1rem' }}>
            ← Back to Orders
          </button>
          <div className="mockup-title" style={{ marginBottom: 0 }}>Order {selectedOrder.quotation_code}</div>
        </div>

        <div className="mockup-summary-cards">
          <div className="mockup-summary-card">
            <h4>Customer</h4>
            <p>{selectedOrder.customer_name}</p>
          </div>
          <div className="mockup-summary-card">
            <h4>Status</h4>
            <p>{selectedOrder.status}</p>
          </div>
        </div>

        <div className="mockup-subtitle" style={{marginTop: '2rem', marginBottom: '0.5rem', fontSize: '0.9rem'}}>Required Products</div>
        <table className="mockup-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Required Qty</th>
            </tr>
          </thead>
          <tbody>
            {selectedOrder.lines?.map(line => (
              <tr key={line.line_id}>
                <td>{line.product_name}</td>
                <td>{line.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {splits && (
          <div style={{ marginTop: '2rem' }}>
            <div className="mockup-subtitle" style={{marginBottom: '0.5rem', fontSize: '0.9rem'}}>Generated Split Allocation</div>
            <table className="mockup-table">
              <thead>
                <tr>
                  <th>Product ID</th>
                  <th>Warehouse</th>
                  <th>Allocated Qty</th>
                  <th>Backorder Qty</th>
                </tr>
              </thead>
              <tbody>
                {splits.map((s, i) => (
                  <tr key={i}>
                    <td>{s.product_id}</td>
                    <td>{s.warehouse_name}</td>
                    <td>{s.qty_fulfilled}</td>
                    <td>{s.backorder_qty > 0 ? <span style={{color: 'red'}}>{s.backorder_qty}</span> : 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedOrder.status === 'Split Pending' && !splits && (
          <div style={{ marginTop: '2rem' }}>
            <button 
              className="btn-gold" 
              onClick={() => handleGenerateSplit(selectedOrder.id)}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Generate Warehouse Split'}
            </button>
          </div>
        )}
        
        {error && <div className="error" style={{ marginTop: '1rem', color: 'red' }}>{error}</div>}
      </section>
    );
  }

  return (
    <section className="mockup-page-container">
      <div className="mockup-title">Fulfillment Operations</div>
      <div className="mockup-subtitle">Manage warehouse splits, backorders, and shipments.</div>

      {error && <div className="error" style={{ color: 'red' }}>{error}</div>}

      <table className="mockup-table" style={{ marginTop: '2rem' }}>
        <thead>
          <tr>
            <th>Order Ref</th>
            <th>Customer</th>
            <th>Lines</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order.id}>
              <td>{order.quotation_code}</td>
              <td>{order.customer_name}</td>
              <td>{order.lines?.length || 0}</td>
              <td>
                <span style={{
                  padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem',
                  backgroundColor: order.status === 'Backorder' ? '#ffecec' : '#f0f0f0',
                  color: order.status === 'Backorder' ? 'red' : 'inherit'
                }}>
                  {order.status}
                </span>
              </td>
              <td>
                <button className="ghost" onClick={() => setSelectedOrder(order)}>View / Split</button>
              </td>
            </tr>
          ))}
          {orders.length === 0 && (
            <tr><td colSpan="5" style={{ textAlign: 'center' }}>No pending orders.</td></tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
