import { authStore } from '../store/auth.svelte';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function login(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Error al iniciar sesión');
  }

  authStore.setSession(data.usuario, data.token);
  return data;
}

export async function register(username, email, password) {
  const res = await fetch(`${API_URL}/auth/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Error al registrarse');
  }

  authStore.setSession(data.usuario, data.token);
  return data;
}

export function logout() {
  authStore.clearSession();
}
