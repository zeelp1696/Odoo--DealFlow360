import { apiGet, apiPost } from './client.js';

export async function createQuotation(customerId) {
  const data = await apiPost('/quotations', { customerId: Number(customerId) });
  return data.quotation; 
}

export async function getQuotations() {
  const data = await apiGet('/quotations');
  return data.quotations;
}

export async function addLine(quotationId, { productId, quantity, discountPercent }) {
  const data = await apiPost(`/quotations/${quotationId}/lines`, { 
    productId: Number(productId), 
    quantity: Number(quantity), 
    discountPercent: Number(discountPercent) 
  });
  return data;
}

export async function submitForApproval(quotationId) {
  const data = await apiPost(`/quotations/${quotationId}/submit`, {});
  return data;
}
