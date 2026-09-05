import { apiGet, apiPost } from './client.js';

export async function getCeilings() {
  const data = await apiGet('/discounts/ceilings');
  return data.ceilings; 
}

export async function getApprovalRules() {
  const data = await apiGet('/discounts/approval-rules');
  return data.rules; 
}
