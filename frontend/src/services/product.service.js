import { authStore } from '../store/auth.svelte';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function getHeaders() {
  const headers = new Headers();
  if (authStore.token) {
    headers.append('Authorization', `Bearer ${authStore.token}`);
  }
  return headers;
}

export async function getProducts() {
  const res = await fetch(`${API_URL}/productos`, {
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al cargar productos');
  return data;
}

export async function getProduct(id) {
  const res = await fetch(`${API_URL}/productos/${id}`, {
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al cargar producto');
  return data;
}

export async function createProduct(formData) {
  const res = await fetch(`${API_URL}/productos`, {
    method: 'POST',
    headers: getHeaders(), // Let fetch calculate Content-Type for FormData
    body: formData
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al crear producto');
  return data;
}

export async function updateProduct(id, formData) {
  const res = await fetch(`${API_URL}/productos/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: formData
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al actualizar producto');
  return data;
}

export async function deleteProduct(id) {
  const res = await fetch(`${API_URL}/productos/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al eliminar producto');
  return data;
}
