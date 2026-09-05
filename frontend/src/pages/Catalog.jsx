import React, { useState, useEffect } from 'react';
import { getProducts, getCustomers, getPriceLists } from '../api/catalogApi.js';
import { apiPost } from '../api/client.js';
import ProductDetails from './ProductDetails.jsx';

export default function Catalog({ user }) {
  const [catalog, setCatalog] = useState({ products: [], customers: [], priceLists: [] });
  const [catalogError, setCatalogError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productForm, setProductForm] = useState({ name: '', category: 'Hardware', basePrice: '', unit: '', tax: '', status: 'Active', description: '', subscription: 'No', quantityOnHand: '150', marginPercent: '20', variants: '' });
  const [productMessage, setProductMessage] = useState('');

  const openAddProductModal = () => {
    setProductMessage('');
    setShowAddProduct(true);
  };

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
      const payload = { 
        name: productForm.name, 
        category: productForm.category, 
        basePrice: productForm.basePrice, 
        unit: productForm.unit || 'unit', 
        taxPercent: Number(productForm.tax) || 0,
        marginPercent: Number(productForm.marginPercent) || 20,
        description: productForm.description,
        variants: productForm.variants,
        quantityOnHand: Number(productForm.quantityOnHand) || 0
      }; 
      const data = await apiPost('/catalog/products', payload);
      setProductMessage(`${data.product.name} added to catalog.`); 
      setProductForm({ name: '', category: 'Hardware', basePrice: '', unit: '', tax: '', status: 'Active', description: '', subscription: 'No', quantityOnHand: '150', marginPercent: '20', variants: '' }); 
      fetchCatalog();
      setShowAddProduct(false); 
      setProductMessage('');
    } catch (err) {
      setProductMessage(err.message); 
    }
  };

  const { products, priceLists } = catalog;

  if (selectedProduct) {
    return <ProductDetails product={selectedProduct} onBack={() => setSelectedProduct(null)} />;
  }

  return (
    <section className="mockup-page-container">
      <div className="mockup-title">Product catalog</div>
      <div className="mockup-subtitle">Every product, variant and price list in one place.</div>

      <div className="mockup-actions">
        {user.role === 'admin' && (
          <button className="btn-gold" onClick={openAddProductModal}>+ New Product</button>
        )}
        <button className="ghost" onClick={() => alert('Manage Price fields configuration panel opened.')}>Manage Price fields</button>
      </div>
      
      {showAddProduct && (
        <div className="mockup-modal-overlay">
          <div className="mockup-modal">
            <h3>Add New Product</h3>
            <form onSubmit={addProduct}>
              <div className="mockup-field-row">
                <label>Product name</label>
                <input value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} required />
              </div>
              <div className="mockup-field-row">
                <label>Category</label>
                <select value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})}>
                  <option>Hardware</option>
                  <option>Services</option>
                  <option>Subscriptions</option>
                </select>
              </div>
              <div className="mockup-field-row">
                <label>Subscription</label>
                <select value={productForm.subscription} onChange={e => setProductForm({...productForm, subscription: e.target.value})}>
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </div>
              <div className="mockup-field-row">
                <label>Quantity on hand</label>
                <input type="number" min="0" value={productForm.quantityOnHand} onChange={e => setProductForm({...productForm, quantityOnHand: e.target.value})} />
              </div>
              <div className="mockup-field-row">
                <label>Margin %</label>
                <input type="number" min="0" step="0.01" value={productForm.marginPercent} onChange={e => setProductForm({...productForm, marginPercent: e.target.value})} />
              </div>
              <div className="mockup-field-row">
                <label>Variants</label>
                <input placeholder="e.g. 3(size)" value={productForm.variants} onChange={e => setProductForm({...productForm, variants: e.target.value})} />
              </div>
              <div className="mockup-field-row">
                <label>Price</label>
                <input type="number" min="0" step="0.01" value={productForm.basePrice} onChange={e => setProductForm({...productForm, basePrice: e.target.value})} required />
              </div>
              <div className="mockup-field-row">
                <label>Unit</label>
                <input placeholder="e.g. piece" value={productForm.unit} onChange={e => setProductForm({...productForm, unit: e.target.value})} />
              </div>
              <div className="mockup-field-row">
                <label>Tax %</label>
                <input type="number" min="0" step="0.01" value={productForm.tax} onChange={e => setProductForm({...productForm, tax: e.target.value})} />
              </div>
              <div className="mockup-field-row">
                <label>Status</label>
                <select value={productForm.status} onChange={e => setProductForm({...productForm, status: e.target.value})}>
                  <option>Active</option>
                  <option>Archived</option>
                </select>
              </div>
              <div className="mockup-field-row">
                <label>Description</label>
                <input placeholder="Short description" value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} />
              </div>
              
              {productMessage && <div className="form-message" style={{marginTop: '1rem'}}>{productMessage}</div>}
              
              <div className="form-actions" style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn-gold" style={{ flex: 1, height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', border: '1px solid transparent' }}>Save Product</button>
                <button type="button" className="ghost" style={{ flex: 1, height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', marginTop: 0 }} onClick={() => setShowAddProduct(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {catalogError && <div className="error">{catalogError}</div>}

      <div className="mockup-summary-cards">
        <div className="mockup-summary-card">
          <h4>Total Products</h4>
          <p>{products.length} active, 0 archived</p>
        </div>
        <div className="mockup-summary-card">
          <h4>Pricelists</h4>
          <p>{priceLists.length} tiers, 2 Currencies</p>
        </div>
        <div className="mockup-summary-card">
          <h4>Variants</h4>
          <p>Mocked: 340 SKUs across all products</p>
        </div>
      </div>

      <div className="mockup-section-title">Products</div>

      <table className="mockup-table">
        <thead>
          <tr>
            <th>Product name</th>
            <th>Category</th>
            <th>Variants</th>
            <th>Price</th>
            <th>Unit</th>
            <th>Tax</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {products.map(product => (
            <tr key={product.id} onClick={() => setSelectedProduct(product)}>
              <td>{product.name}</td>
              <td>{product.category}</td>
              <td>{product.variants?.length > 0 ? product.variants.map(v => v.attributeValue).join(', ') : '-'}</td>
              <td>${Number(product.base_price).toLocaleString()}</td>
              <td>{product.unit}</td>
              <td>{Number(product.tax_percent || 0).toFixed(2)}%</td>
              <td>Active</td>
            </tr>
          ))}
          {products.length === 0 && (
            <tr><td colSpan="7" style={{textAlign: 'center'}}>No products found</td></tr>
          )}
        </tbody>
      </table>

      <div className="mockup-alert-yellow">
        Click a product row to open general info, variants and tier/currency price lists.
      </div>
    </section>
  );
}
