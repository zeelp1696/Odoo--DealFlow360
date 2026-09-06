import { apiGet, apiPatch } from './client.js';

export async function getApprovals() {
  const data = await apiGet('/approvals');
  return data.approvals || [];
}

export async function getApprovalDetails(id) {
  const data = await apiGet(`/approvals/${id}`);
  return data;
}

export async function updateApproval(id, action, note) {
  const data = await apiPatch(`/approvals/${id}`, { action, note });
  return data;
}
