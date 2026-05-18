import { get, post, patch, del } from './client';

export const getProjectMembers = (projectId) =>
  get(`/projects/${projectId}/members`);

export const addProjectMember = (projectId, { username, role }) =>
  post(`/projects/${projectId}/members`, { username, role });

export const updateProjectMemberRole = (projectId, userId, role) =>
  patch(`/projects/${projectId}/members/${userId}`, { role });

export const removeProjectMember = (projectId, userId) =>
  del(`/projects/${projectId}/members/${userId}`);
