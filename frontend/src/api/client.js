const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

function authHeaders() {
  const session = localStorage.getItem('dealflow-session');
  if (session) {
    try {
      const parsed = JSON.parse(session);
      return { 'Authorization': `Bearer ${parsed.token}`, 'Content-Type': 'application/json' };
    } catch {
      return { 'Content-Type': 'application/json' };
    }
  }
  return { 'Content-Type': 'application/json' };
}

export async function apiGet(path) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: authHeaders() });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || `GET ${path} failed`);
  }
  return res.json();
}

export async function apiPost(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, { 
    method: 'POST', 
    headers: authHeaders(),
    body: JSON.stringify(body) 
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `POST ${path} failed`);
  }
  return data;
}

export async function apiPatch(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, { 
    method: 'PATCH', 
    headers: authHeaders(),
    body: JSON.stringify(body) 
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `PATCH ${path} failed`);
  }
  return data;
}

export async function apiPut(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, { 
    method: 'PUT', 
    headers: authHeaders(),
    body: JSON.stringify(body) 
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `PUT ${path} failed`);
  }
  return data;
}

export async function apiDelete(path) {
  const res = await fetch(`${BASE_URL}${path}`, { 
    method: 'DELETE', 
    headers: authHeaders() 
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `DELETE ${path} failed`);
  }
  return data;
}
