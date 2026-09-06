import { apiGet, apiPost, apiPatch, apiDelete } from './client.js';

export async function createQuotation(userId) {
  const data = await apiPost('/quotations', { userId: Number(userId) });
  return data.quotation; 
}

export async function getQuotations() {
  const data = await apiGet('/quotations');
  return data.quotations;
}

export async function getQuotation(id) {
  const data = await apiGet(`/quotations/${id}`);
  return data;
}

export async function updateLine(quotationId, lineId, { quantity, discountPercent }) {
  const data = await apiPatch(`/quotations/${quotationId}/lines/${lineId}`, { 
    quantity: quantity !== undefined ? Number(quantity) : undefined, 
    discountPercent: discountPercent !== undefined ? Number(discountPercent) : undefined 
  });
  return data;
}

export async function deleteLine(quotationId, lineId) {
  const data = await apiDelete(`/quotations/${quotationId}/lines/${lineId}`);
  return data;
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
