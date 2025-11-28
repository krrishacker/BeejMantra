import axios from 'axios';

export interface AuthUser {
  phone: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: AuthUser;
}

export async function login(phone: string, password: string, remember: boolean): Promise<AuthResponse> {
  const { data } = await axios.post<AuthResponse>('/api/auth/login', { phone, password, remember });
  return data;
}

export async function signup(phone: string, password: string): Promise<AuthResponse> {
  const { data } = await axios.post<AuthResponse>('/api/auth/signup', { phone, password });
  return data;
}

export function saveSession(token: string, user: AuthUser, remember: boolean) {
  const storage = remember ? window.localStorage : window.sessionStorage;
  storage.setItem('auth_token', token);
  storage.setItem('auth_user', JSON.stringify(user));
}

export function clearSession() {
  window.localStorage.removeItem('auth_token');
  window.localStorage.removeItem('auth_user');
  window.sessionStorage.removeItem('auth_token');
  window.sessionStorage.removeItem('auth_user');
}

export function getCurrentUser(): AuthUser | null {
  const raw = window.localStorage.getItem('auth_user') || window.sessionStorage.getItem('auth_user');
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthUser; } catch { return null; }
}

export function isAuthenticated(): boolean {
  const token = window.localStorage.getItem('auth_token') || window.sessionStorage.getItem('auth_token');
  return !!token;
}


