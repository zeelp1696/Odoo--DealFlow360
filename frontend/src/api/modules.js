const API = 'http://localhost:4000/api';
export async function getModuleData(token, module) {
  const response = await fetch(`${API}/modules/${module}`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || 'This module is not available for your role.');
  return body;
}