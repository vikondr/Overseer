import { get } from './client';

export const getMe = () => get('/auth/me');
export const verifyToken = () => get('/auth/verify');
