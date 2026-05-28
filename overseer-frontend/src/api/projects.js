import { get, post, del } from './client';

// The web client is read-only for repo content. Project create/update/delete live in the desktop app.
// Star/unstar are kept because they are a social interaction, not a repo mutation.
export const getProject = (id) => get(`/projects/${id}`);
export const getProjectBySlug = (username, slug) => get(`/projects/by/${username}/${slug}`);
export const getUserProjects = (username) => get(`/projects/user/${username}`);
export const getStarredProjects = (username) => get(`/projects/user/${username}/starred`);
export const exploreProjects = (page = 0, size = 20, sort = 'stars') =>
  get('/projects/explore', { page, size, sort });
export const searchProjects = (q, page = 0, size = 20) =>
  get('/projects/search', { q, page, size });
export const getProjectsByTag = (tag, page = 0, size = 20) =>
  get(`/projects/tag/${tag}`, { page, size });
export const starProject = (id) => post(`/projects/${id}/star`);
export const unstarProject = (id) => del(`/projects/${id}/star`);
