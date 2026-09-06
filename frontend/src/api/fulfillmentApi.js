import { apiGet, apiPatch } from './client.js';

export async function getFulfillmentData() {
  const data = await apiGet('/fulfillment');
  return data;
}

export async function getFulfillmentDetail(id) {
  const data = await apiGet(`/fulfillment/${id}`);
  return data;
}

export async function updateFulfillment(id, action, manualSplits = null) {
  const data = await apiPatch(`/fulfillment/${id}`, { action, manualSplits });
  return data;
}

export async function updateStock(id, inStock, reserved) {
  const data = await apiPatch(`/fulfillment/stock/${id}`, { inStock, reserved });
  return data;
}
