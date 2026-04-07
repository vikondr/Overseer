const BASE = '/api';

function getToken() {
  return localStorage.getItem('overseer_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `HTTP ${res.status}`);
  }

  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const get = (path, params) => {
  const qs = params ? '?' + new URLSearchParams(params) : '';
  return request(`${path}${qs}`);
};

export const post = (path, body) =>
  request(path, {
    method: 'POST',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

export const patch = (path, body) =>
  request(path, { method: 'PATCH', body: JSON.stringify(body) });

export const del = (path) =>
  request(path, { method: 'DELETE' });

export const upload = (path, formData) => {
  const token = getToken();
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  }).then(async (res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  });
};
