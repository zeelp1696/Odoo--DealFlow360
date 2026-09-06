import { apiGet, apiPatch, apiPost } from './client.js';

export async function getSubscriptions() {
  const data = await apiGet('/subscriptions');
  return data;
}

export async function getSubscriptionDetail(id) {
  const data = await apiGet(`/subscriptions/${id}`);
  return data;
}

export async function updateSubscription(id, action) {
  const data = await apiPatch(`/subscriptions/${id}`, { action });
  return data;
}

export async function createSubscription(payload) {
  const data = await apiPost('/subscriptions', payload);
  return data;
}
