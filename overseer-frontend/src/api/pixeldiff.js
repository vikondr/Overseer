function authHeaders() {
  const token = localStorage.getItem('overseer_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchFileBlob(fileId) {
  const res = await fetch(`/api/files/${fileId}/download`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);
  return res.blob();
}

export async function diffImages(blobA, blobB) {
  const fd = new FormData();
  fd.append('image_a', blobA, 'a');
  fd.append('image_b', blobB, 'b');
  const res = await fetch('/pixeldiff/diff', { method: 'POST', body: fd });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `Pixel diff failed (${res.status})`);
  }
  return res.json();
}