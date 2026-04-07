import { get, upload } from './client';

export const uploadSheetFile = (sheetId, file, message = '') => {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('message', message);
  return upload(`/sheets/${sheetId}/files`, fd);
};

export const getSheetFiles = (sheetId) => get(`/sheets/${sheetId}/files`);

export const getFileVersions = (sheetId, fileName) =>
  get(`/sheets/${sheetId}/files/${encodeURIComponent(fileName)}/versions`);

export const diffFiles = (fileA, fileB) => get('/files/diff', { fileA, fileB });
