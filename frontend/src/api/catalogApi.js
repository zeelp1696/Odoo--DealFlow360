import { apiGet, apiPost } from './client.js';

export async function getProducts() {
  const data = await apiGet('/catalog/products');
  return data.products; // backend returns { products: [...] }
}

export async function getCustomers() {
  const data = await apiGet('/catalog/customers');
  return data.customers; 
}

export async function getPriceLists() {
  const data = await apiGet('/catalog/price-lists');
  return data.priceLists;
}

export async function getMetadata() {
  const data = await apiGet('/catalog/metadata');
  return data;
}
