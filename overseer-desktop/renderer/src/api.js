export function pixelDiffUrlFor(backendUrl) {
  try {
    const u = new URL(backendUrl);
    u.port = '8001';
    u.pathname = '';
    return u.origin;
  } catch {
    return 'http://localhost:8001';
  }
}

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

async function networkSafe(promise) {
  try { return await promise; }
  catch { throw new Error("We couldn't reach the server. Please check your connection."); }
}

export function createApi(baseUrl, token) {
  const h    = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const hRaw = { Authorization: `Bearer ${token}` };
  const pixelBase = pixelDiffUrlFor(baseUrl);

  const get = async (path) => {
    const r = await networkSafe(fetch(`${baseUrl}${path}`, { headers: h }));
    if (!r.ok) throw new Error(await friendlyError(r));
    return r.json();
  };

  const post = async (path, body) => {
    const r = await networkSafe(fetch(`${baseUrl}${path}`, {
      method: 'POST', headers: h, body: JSON.stringify(body),
    }));
    if (!r.ok) throw new Error(await friendlyError(r));
    return r.json();
  };

  const patch = async (path, body) => {
    const r = await networkSafe(fetch(`${baseUrl}${path}`, {
      method: 'PATCH', headers: h, body: JSON.stringify(body),
    }));
    if (!r.ok) throw new Error(await friendlyError(r));
    return r.json();
  };

  const del = async (path) => {
    const r = await networkSafe(fetch(`${baseUrl}${path}`, { method: 'DELETE', headers: h }));
    if (!r.ok) throw new Error(await friendlyError(r));
    if (r.status === 204) return null;
    return r.json().catch(() => null);
  };

  return {
    getMe: () => get('/api/auth/me'),
    getProjects: (username) => get(`/api/projects/user/${username}`),
    getProjectBySlug: (username, slug) => get(`/api/projects/by/${username}/${slug}`),
    getSheet: (projectId, sheetId) => get(`/api/projects/${projectId}/sheets/${sheetId}`),
    getSheets: (projectId) => get(`/api/projects/${projectId}/sheets`),
    getFileVersions: (sheetId, fileName) =>
      get(`/api/sheets/${sheetId}/files/${encodeURIComponent(fileName)}/versions`),

    createProject: (data) => post('/api/projects', data),
    createSheet: (projectId, data) => post(`/api/projects/${projectId}/sheets`, data),
    forkSheet: (projectId, sheetId, data) =>
      post(`/api/projects/${projectId}/sheets/${sheetId}/fork`, data),
    previewMerge: (projectId, sheetId) =>
      get(`/api/projects/${projectId}/sheets/${sheetId}/merge/preview`),
    commitMerge: (projectId, sheetId, data) =>
      post(`/api/projects/${projectId}/sheets/${sheetId}/merge`, data),

    listMembers: (projectId) => get(`/api/projects/${projectId}/members`),
    addMember: (projectId, data) => post(`/api/projects/${projectId}/members`, data),
    updateMemberRole: (projectId, userId, role) =>
      patch(`/api/projects/${projectId}/members/${userId}`, { role }),
    removeMember: (projectId, userId) =>
      del(`/api/projects/${projectId}/members/${userId}`),

    searchUsers: (q, page = 0, size = 8) =>
      get(`/api/users/search?q=${encodeURIComponent(q)}&page=${page}&size=${size}`),

    deleteSheet: (projectId, sheetId) =>
      del(`/api/projects/${projectId}/sheets/${sheetId}`),

    deleteProject: (projectId) =>
      del(`/api/projects/${projectId}`),

    updateProject: (projectId, data) =>
      patch(`/api/projects/${projectId}`, data),

    // Backend stores relative URLs (e.g. /api/users/foo/avatar). The renderer is
    // loaded from a file:// or vite dev URL, so relative paths can't reach the
    // backend — prepend the baseUrl when needed.
    resolveUrl: (url) => {
      if (!url) return url;
      if (url.startsWith('/api/')) return `${baseUrl}${url}`;
      return url;
    },

    uploadFile: async (sheetId, file, commitMessage) => {
      const fd = new FormData();
      fd.append('file', file);
      if (commitMessage) fd.append('message', commitMessage);
      const r = await networkSafe(fetch(`${baseUrl}/api/sheets/${sheetId}/files`, {
        method: 'POST',
        headers: hRaw,
        body: fd,
      }));
      if (!r.ok) throw new Error(await friendlyError(r));
      return r.json();
    },

    fetchFileBlob: async (fileId) => {
      const r = await networkSafe(fetch(`${baseUrl}/api/files/${fileId}/download`, { headers: hRaw }));
      if (!r.ok) throw new Error(await friendlyError(r));
      return r.blob();
    },

    diffImages: async (blobA, blobB) => {
      const fd = new FormData();
      fd.append('image_a', blobA, 'a');
      fd.append('image_b', blobB, 'b');
      const r = await networkSafe(fetch(`${pixelBase}/diff`, { method: 'POST', body: fd }));
      if (!r.ok) {
        throw new Error("Couldn't compare these images — please try again.");
      }
      return r.json();
    },
  };
}