import { get, patch, post, del } from './client';

export const getUser = (username) => get(`/users/${username}`);
export const updateProfile = (data) => patch('/users/me', data);
export const followUser = (username) => post(`/users/${username}/follow`);
export const unfollowUser = (username) => del(`/users/${username}/follow`);
