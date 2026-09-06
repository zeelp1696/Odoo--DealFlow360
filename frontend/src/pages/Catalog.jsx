import React, { useState, useEffect } from 'react';
import { getProducts, getCustomers, getPriceLists, getMetadata } from '../api/catalogApi.js';
import { apiPost } from '../api/client.js';
import ProductDetails from './ProductDetails.jsx';

export default function Catalog({ user }) {
  const [catalog, setCatalog] = useState({ products: [], customers: [], priceLists: [] });
  const [catalogError, setCatalogError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  const [metadata, setMetadata] = useState({ categories: ['Hardware', 'Services', 'Subscriptions'], warehouses: [] });
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productForm, setProductForm] = useState({ 
    name: '', category: 'Hardware', newCategory: '', 
    basePrice: '', unit: '', status: 'Active', description: '', subscription: 'No', 
    marginPercent: '20', taxPercent: '0', variants: '', warehouseStocks: [] 
  });
  const [productMessage, setProductMessage] = useState('');
  
  const [addingNewCategory, setAddingNewCategory] = useState(false);

  const openAddProductModal = () => {
    setProductMessage('');
    setProductForm(f => ({ 
      ...f, 
      category: metadata.categories[0] || 'Hardware', 
      newCategory: '', 
      warehouseStocks: metadata.warehouses.length > 0 
        ? [{ id: Date.now(), warehouseId: metadata.warehouses[0].id, newWarehouseName: '', stock: '0', isNew: false }] 
        : [] 
    }));
    setAddingNewCategory(false);
    setShowAddProduct(true);
  };

  const fetchCatalog = () => {
    Promise.all([getProducts(), getCustomers(), getPriceLists(), getMetadata()])
      .then(([products, customers, priceLists, meta]) => {
        setCatalog({ products: products || [], customers: customers || [], priceLists: priceLists || [] });
        if (meta) {
          setMetadata(meta);
        }
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
        category: addingNewCategory ? productForm.newCategory : productForm.category, 
        basePrice: productForm.basePrice, 
        unit: productForm.unit || 'unit', 
        description: productForm.description,
        marginPercent: Number(productForm.marginPercent) || 0,
        taxPercent: Number(productForm.taxPercent) || 0,
        variants: productForm.variants,
        warehouseStocks: productForm.warehouseStocks
      }; 
      const data = await apiPost('/catalog/products', payload);
      setProductMessage(`${data.product.name} added to catalog.`); 
      setProductForm({ 
        name: '', category: metadata.categories[0] || 'Hardware', newCategory: '', 
        basePrice: '', unit: '', status: 'Active', description: '', subscription: 'No', 
        marginPercent: '20', taxPercent: '0', variants: '', warehouseStocks: [] 
      }); 
      setAddingNewCategory(false);
      fetchCatalog();
      setShowAddProduct(false); 
      setProductMessage('');
    } catch (err) {
      setProductMessage(err.message); 
    }
  };

  const addWarehouseStock = () => {
    setProductForm(f => ({
      ...f,
      warehouseStocks: [...f.warehouseStocks, { id: Date.now(), warehouseId: metadata.warehouses[0]?.id || '', newWarehouseName: '', stock: '0', isNew: false }]
    }));
  };

  const removeWarehouseStock = (index) => {
    setProductForm(f => ({
      ...f,
      warehouseStocks: f.warehouseStocks.filter((_, i) => i !== index)
    }));
  };

  const updateWarehouseStock = (index, field, value) => {
    setProductForm(f => {
      const newStocks = [...f.warehouseStocks];
      newStocks[index][field] = value;
      return { ...f, warehouseStocks: newStocks };
    });
  };

  const toggleNewWarehouse = (index, force) => {
    setProductForm(f => {
      const newStocks = [...f.warehouseStocks];
      newStocks[index].isNew = force !== undefined ? force : !newStocks[index].isNew;
      if (newStocks[index].isNew) {
        newStocks[index].newWarehouseName = '';
      }
      return { ...f, warehouseStocks: newStocks };
    });
  };

  const confirmNewCategory = () => {
    const cat = productForm.newCategory.trim();
    if (!cat) {
      setAddingNewCategory(false);
      return;
    }
    if (!metadata.categories.includes(cat)) {
      setMetadata(m => ({ ...m, categories: [...m.categories, cat] }));
    }
    setProductForm(f => ({ ...f, category: cat, newCategory: '' }));
    setAddingNewCategory(false);
  };

  const confirmNewWarehouse = (index) => {
    const ws = productForm.warehouseStocks[index];
    const name = ws.newWarehouseName.trim();
    if (!name) {
      toggleNewWarehouse(index, false);
      return;
    }
    
    let existing = metadata.warehouses.find(w => w.name.toLowerCase() === name.toLowerCase());
    let newId = existing ? existing.id : 'NEW_' + Date.now();
    
    if (!existing) {
      setMetadata(m => ({ ...m, warehouses: [...m.warehouses, { id: newId, name }] }));
    }
    
    updateWarehouseStock(index, 'warehouseId', newId);
    toggleNewWarehouse(index, false);
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
                <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                  {addingNewCategory ? (
                    <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                      <input 
                        placeholder="New category name" 
                        value={productForm.newCategory} 
                        onChange={e => setProductForm({...productForm, newCategory: e.target.value})} 
                        style={{ flex: 1 }} 
                        autoFocus 
                      />
                      <button type="button" onClick={confirmNewCategory} style={{ background: '#10b981', color: 'white', width: '38px', height: '38px', flex: '0 0 auto', border: 'none', padding: 0, borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        ✔
                      </button>
                      <button type="button" onClick={() => setAddingNewCategory(false)} style={{ background: '#ef4444', color: 'white', width: '38px', height: '38px', flex: '0 0 auto', border: 'none', padding: 0, borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        ✖
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                      <select value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})} style={{ flex: 1 }}>
                        {metadata.categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                      <button type="button" onClick={() => setAddingNewCategory(true)} style={{ background: '#e2e8f0', width: '38px', height: '38px', flex: '0 0 auto', border: 'none', padding: 0, borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="mockup-field-row">
                <label>Subscription</label>
                <select value={productForm.subscription} onChange={e => setProductForm({...productForm, subscription: e.target.value})}>
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </div>

              <div className="mockup-field-row">
                <label>Variants</label>
                <input placeholder="e.g. 3(size)" value={productForm.variants} onChange={e => setProductForm({...productForm, variants: e.target.value})} />
              </div>
              
              <div className="mockup-field-row" style={{ alignItems: 'flex-start' }}>
                <label style={{ marginTop: '0.6rem' }}>Initial Stock</label>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {productForm.warehouseStocks.map((ws, i) => (
                    <div key={ws.id} style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                      {ws.isNew ? (
                        <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                          <input 
                            placeholder="New warehouse name" 
                            value={ws.newWarehouseName} 
                            onChange={e => updateWarehouseStock(i, 'newWarehouseName', e.target.value)} 
                            style={{ flex: 1 }} 
                            autoFocus 
                          />
                          <button type="button" onClick={() => confirmNewWarehouse(i)} style={{ background: '#10b981', color: 'white', width: '38px', height: '38px', flex: '0 0 auto', border: 'none', padding: 0, borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            ✔
                          </button>
                          <button type="button" onClick={() => toggleNewWarehouse(i, false)} style={{ background: '#ef4444', color: 'white', width: '38px', height: '38px', flex: '0 0 auto', border: 'none', padding: 0, borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            ✖
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                          <select value={ws.warehouseId} onChange={e => updateWarehouseStock(i, 'warehouseId', e.target.value)} style={{ flex: 1 }}>
                            {metadata.warehouses.length === 0 && <option value="">No warehouses</option>}
                            {metadata.warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                          </select>
                          <button type="button" title="Create new warehouse" onClick={() => toggleNewWarehouse(i, true)} style={{ background: '#e2e8f0', width: '38px', height: '38px', flex: '0 0 auto', border: 'none', padding: 0, borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            +
                          </button>
                        </div>
                      )}
                      <input 
                        type="number" 
                        min="0" 
                        placeholder="Qty"
                        value={ws.stock} 
                        onChange={e => updateWarehouseStock(i, 'stock', e.target.value)} 
                        style={{ width: '80px', flex: '0 0 auto' }} 
                      />
                      {productForm.warehouseStocks.length > 1 && (
                        <button type="button" onClick={() => removeWarehouseStock(i)} style={{ background: '#fee2e2', color: '#ef4444', width: '38px', height: '38px', flex: '0 0 auto', border: 'none', padding: 0, borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          -
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addWarehouseStock} style={{ alignSelf: 'flex-start', fontSize: '0.85rem', color: '#3b82f6', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginTop: '0.25rem' }}>
                    + Add another warehouse
                  </button>
                </div>
              </div>

              <div className="mockup-field-row">
                <label>Price</label>
                <input type="number" min="0" step="0.01" value={productForm.basePrice} onChange={e => setProductForm({...productForm, basePrice: e.target.value})} required />
              </div>
              <div className="mockup-field-row">
                <label>Margin %</label>
                <input type="number" min="0" step="0.01" value={productForm.marginPercent} onChange={e => setProductForm({...productForm, marginPercent: e.target.value})} />
              </div>
              <div className="mockup-field-row">
                <label>Tax %</label>
                <input type="number" min="0" step="0.01" value={productForm.taxPercent} onChange={e => setProductForm({...productForm, taxPercent: e.target.value})} />
              </div>
              <div className="mockup-field-row">
                <label>Unit</label>
                <input placeholder="e.g. piece" value={productForm.unit} onChange={e => setProductForm({...productForm, unit: e.target.value})} />
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
              
              <div className="form-actions" style={{ display: 'flex', flexDirection: 'row', gap: '1rem', width: '100%', marginTop: '1.5rem' }}>
                <button type="submit" className="btn-gold" style={{ flex: 1, height: '42px', boxSizing: 'border-box' }}>Save Product</button>
                <button type="button" className="ghost" style={{ flex: 1, height: '42px', boxSizing: 'border-box', borderRadius: '8px' }} onClick={() => setShowAddProduct(false)}>Cancel</button>
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
