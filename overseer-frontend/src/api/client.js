const BASE = '/api';

function getToken() {
  return localStorage.getItem('overseer_token');
}

// Friendly fallbacks for the rare cases the backend doesn't supply a message.
const STATUS_FALLBACK = {
  400: "We couldn't process that request. Please review the details and try again.",
  401: 'Please sign in to continue.',
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for.",
  409: 'That conflicts with something that already exists.',
  413: 'That file is too large to upload.',
  415: "That file type isn't supported.",
  422: 'Some of the information looks incorrect.',
  429: 'Too many requests right now — give it a moment and try again.',
  500: 'Something went wrong on our side. Please try again in a moment.',
  502: 'The server is unreachable right now. Please try again shortly.',
  503: 'The service is temporarily unavailable. Please try again shortly.',
  504: 'The request took too long. Please try again.',
};

async function friendlyError(res) {
  let payload = null;
  try {
    const text = await res.text();
    if (text) {
      try { payload = JSON.parse(text); }
      catch { payload = { message: text }; }
    }
  } catch { /* ignore */ }
  const raw = payload?.message || payload?.error;
  if (raw && !/^\d{3}\b/.test(raw)) return raw;
  return STATUS_FALLBACK[res.status] ?? 'Something went wrong. Please try again.';
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let res;
  try {
    res = await fetch(`${BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error("We couldn't reach the server. Please check your connection.");
  }

  if (!res.ok) {
    throw new Error(await friendlyError(res));
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
    if (!res.ok) throw new Error(await friendlyError(res));
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  });
};
