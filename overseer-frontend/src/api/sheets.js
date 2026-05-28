import { get } from './client';

// The web client is read-only — sheet/fork/merge mutations live in the desktop app.
export const getSheets = (projectId) => get(`/projects/${projectId}/sheets`);
export const getSheet = (projectId, sheetId) => get(`/projects/${projectId}/sheets/${sheetId}`);
