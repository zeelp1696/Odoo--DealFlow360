const API = 'http://localhost:4000/api/customer-portal';

async function request(token, path, options = {}) {
  const response = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || 'Customer portal request failed.');
  return body;
}

export const getCustomerQuote = token => request(token, '/quote');
export const updateCustomerProfile = (token, name) => request(token, '/profile', { method: 'PATCH', body: JSON.stringify({ name }) });
export const sendCustomerRequest = (token, quoteId, payload) => request(token, `/quote/${quoteId}/messages`, { method: 'POST', body: JSON.stringify(payload) });
export const confirmCustomerQuote = (token, quoteId) => request(token, `/quote/${quoteId}/confirm`, { method: 'POST', body: '{}' });