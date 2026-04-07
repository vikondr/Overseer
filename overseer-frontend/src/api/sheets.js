import { get, post, del } from './client';

export const createSheet = (projectId, data) => post(`/projects/${projectId}/sheets`, data);
export const getSheets = (projectId) => get(`/projects/${projectId}/sheets`);
export const getSheet = (projectId, sheetId) => get(`/projects/${projectId}/sheets/${sheetId}`);
export const deleteSheet = (projectId, sheetId) => del(`/projects/${projectId}/sheets/${sheetId}`);
