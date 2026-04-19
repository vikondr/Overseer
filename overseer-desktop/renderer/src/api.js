export function createApi(baseUrl, token) {
  const h    = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const hRaw = { Authorization: `Bearer ${token}` };

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
    getProjects: (username) => get(`/api/users/${username}/projects`),
    getProjectBySlug: (username, slug) => get(`/api/projects/${username}/${slug}`),
    getSheet: (projectId, sheetId) => get(`/api/projects/${projectId}/sheets/${sheetId}`),
    getSheets: (projectId) => get(`/api/projects/${projectId}/sheets`),

    createProject: (data) => post('/api/projects', data),
    createSheet: (projectId, data) => post(`/api/projects/${projectId}/sheets`, data),

    uploadFile: (sheetId, file, commitMessage) => {
      const fd = new FormData();
      fd.append('file', file);
      if (commitMessage) fd.append('commitMessage', commitMessage);
      return fetch(`${baseUrl}/api/sheets/${sheetId}/files`, {
        method: 'POST',
        headers: hRaw,
        body: fd,
      }).then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      });
    },
  };
}