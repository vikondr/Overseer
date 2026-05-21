import { get, post, del } from './client';

export const createSheet = (projectId, data) => post(`/projects/${projectId}/sheets`, data);
export const getSheets = (projectId) => get(`/projects/${projectId}/sheets`);
export const getSheet = (projectId, sheetId) => get(`/projects/${projectId}/sheets/${sheetId}`);
export const deleteSheet = (projectId, sheetId) => del(`/projects/${projectId}/sheets/${sheetId}`);

export const forkSheet = (projectId, sheetId, data) =>
  post(`/projects/${projectId}/sheets/${sheetId}/fork`, data);

export const previewMerge = (projectId, sheetId) =>
  get(`/projects/${projectId}/sheets/${sheetId}/merge/preview`);

export const commitMerge = (projectId, sheetId, data) =>
  post(`/projects/${projectId}/sheets/${sheetId}/merge`, data);
