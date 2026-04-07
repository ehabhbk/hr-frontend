import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1/hr-app/public/api",
  headers: { "Accept": "application/json" },
});

export const API_BASE = "http://127.0.0.1/hr-app/public/api";
export const STORAGE_URL = "http://127.0.0.1/hr-app/public/storage";

export function getStorageUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${STORAGE_URL}${path}`;
}

export function getFullUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
}

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export async function downloadBlob(url, options = {}) {
  const token = localStorage.getItem("token");
  const response = await fetch(getFullUrl(url), {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': token ? `Bearer ${token}` : '',
      ...(options.headers?.['Content-Type'] ? {} : { 'Accept': 'application/pdf,application/json,*/*' }),
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.blob();
}

export default api;
