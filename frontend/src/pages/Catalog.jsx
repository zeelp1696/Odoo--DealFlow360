import React, { useState, useEffect } from 'react';
import { getProducts, getCustomers, getPriceLists } from '../api/catalogApi.js';
import { apiPost } from '../api/client.js';

export default function Catalog({ user }) {
  const [catalog, setCatalog] = useState({ products: [], customers: [], priceLists: [] });
  const [catalogError, setCatalogError] = useState('');
  
  const [productForm, setProductForm] = useState({ name: '', category: 'Hardware', basePrice: '', marginPercent: '20' });
  const [productMessage, setProductMessage] = useState('');

  const fetchCatalog = () => {
    Promise.all([getProducts(), getCustomers(), getPriceLists()])
      .then(([products, customers, priceLists]) => {
        setCatalog({ products: products || [], customers: customers || [], priceLists: priceLists || [] });
      })
      .catch(error => setCatalogError(error.message));
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const addProduct = async event => { 
    event.preventDefault(); 
    setProductMessage(''); 
    try {
      const data = await apiPost('/catalog/products', productForm);
      setProductMessage(`${data.product.name} added to catalog.`); 
      setProductForm({ name: '', category: 'Hardware', basePrice: '', marginPercent: '20' }); 
      fetchCatalog();
    } catch (err) {
      setProductMessage(err.message); 
    }
  };

  const { products, customers, priceLists } = catalog;

  return (
    <section className="catalog-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Catalog & customer data</span>
          <h2>Master data in motion</h2>
        </div>
        <span className="data-count">{products.length} products · {customers.length} customers</span>
      </div>
      
      {catalogError && <div className="error">{catalogError}</div>}
      
      <div className="catalog-grid">
        <div className="data-panel">
          <small>PRODUCT CATALOG</small>
          {products.map(product => (
            <div className="data-row" key={product.id}>
              <div>
                <strong>{product.name}</strong>
                <span>{product.category} · {product.unit}</span>
              </div>
              <b>${Number(product.base_price).toLocaleString()}</b>
            </div>
          ))}
        </div>
        <div className="data-panel">
          <small>CUSTOMER TIERS</small>
          {customers.map(customer => (
            <div className="data-row" key={customer.id}>
              <div>
                <strong>{customer.name}</strong>
                <span>{customer.currency}</span>
              </div>
              <b className={`tier tier-${customer.tier.toLowerCase()}`}>{customer.tier}</b>
            </div>
          ))}
          <small className="list-label">PRICE LISTS</small>
          {priceLists.map(priceList => (
            <div className="data-row compact" key={priceList.id}>
              <strong>{priceList.name}</strong>
              <span>{priceList.items.length} priced products</span>
            </div>
          ))}
        </div>
      </div>
      
      {user.role === 'admin' && (
        <form className="add-product" onSubmit={addProduct}>
          <div>
            <small>ADMIN ACTION</small>
            <h3>Add product</h3>
          </div>
          <input placeholder="Product name" value={productForm.name} onChange={event => setProductForm({ ...productForm, name: event.target.value })} required />
          <select value={productForm.category} onChange={event => setProductForm({ ...productForm, category: event.target.value })}>
            <option>Hardware</option>
            <option>Services</option>
            <option>Subscriptions</option>
          </select>
          <input type="number" min="0" step="0.01" placeholder="Base price" value={productForm.basePrice} onChange={event => setProductForm({ ...productForm, basePrice: event.target.value })} required />
          <button type="submit" className="btn-gold">Add to catalog ↗</button>
          {productMessage && <span className="form-message">{productMessage}</span>}
        </form>
      )}
    </section>
  );
}
