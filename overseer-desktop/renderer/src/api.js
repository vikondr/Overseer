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

export function createApi(baseUrl, token) {
  const h    = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const hRaw = { Authorization: `Bearer ${token}` };
  const pixelBase = pixelDiffUrlFor(baseUrl);

  const get = (path) =>
    fetch(`${baseUrl}${path}`, { headers: h }).then((r) => {
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      return r.json();
    });

  const post = (path, body) =>
    fetch(`${baseUrl}${path}`, { method: 'POST', headers: h, body: JSON.stringify(body) }).then((r) => {
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      return r.json();
    });

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

    uploadFile: (sheetId, file, commitMessage) => {
      const fd = new FormData();
      fd.append('file', file);
      if (commitMessage) fd.append('message', commitMessage);
      return fetch(`${baseUrl}/api/sheets/${sheetId}/files`, {
        method: 'POST',
        headers: hRaw,
        body: fd,
      }).then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      });
    },

    fetchFileBlob: (fileId) =>
      fetch(`${baseUrl}/api/files/${fileId}/download`, { headers: hRaw }).then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.blob();
      }),

    diffImages: (blobA, blobB) => {
      const fd = new FormData();
      fd.append('image_a', blobA, 'a');
      fd.append('image_b', blobB, 'b');
      return fetch(`${pixelBase}/diff`, { method: 'POST', body: fd }).then(async (r) => {
        if (!r.ok) {
          const msg = await r.text().catch(() => r.statusText);
          throw new Error(msg || `Pixel diff failed (${r.status})`);
        }
        return r.json();
      });
    },
  };
}