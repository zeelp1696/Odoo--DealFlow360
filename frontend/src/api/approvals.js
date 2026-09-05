const API = 'http://localhost:4000/api';

export async function getPendingApprovals(token) {
  const response = await fetch(`${API}/approvals`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || 'Could not load approvals.');
  return body.approvals;
}

export async function decideApproval(token, approvalId, action) {
  const response = await fetch(`${API}/approvals/${approvalId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || 'Could not update approval.');
  return body;
}