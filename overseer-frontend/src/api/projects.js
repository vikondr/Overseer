import { get, post, patch, del } from './client';

export const createProject = (data) => post('/projects', data);
export const getProject = (id) => get(`/projects/${id}`);
export const getProjectBySlug = (username, slug) => get(`/projects/by/${username}/${slug}`);
export const updateProject = (id, data) => patch(`/projects/${id}`, data);
export const deleteProject = (id) => del(`/projects/${id}`);
export const getUserProjects = (username) => get(`/projects/user/${username}`);
export const exploreProjects = (page = 0, size = 20, sort = 'stars') =>
  get('/projects/explore', { page, size, sort });
export const searchProjects = (q, page = 0, size = 20) =>
  get('/projects/search', { q, page, size });
export const getProjectsByTag = (tag, page = 0, size = 20) =>
  get(`/projects/tag/${tag}`, { page, size });
export const starProject = (id) => post(`/projects/${id}/star`);
export const unstarProject = (id) => del(`/projects/${id}/star`);
