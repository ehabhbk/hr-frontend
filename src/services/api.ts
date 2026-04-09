import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

const API_HOST = "http://127.0.0.1/hr-app/public";

const api: AxiosInstance = axios.create({
  baseURL: `${API_HOST}/api`,
  headers: { "Accept": "application/json" },
});

export const API_BASE = `${API_HOST}/api`;
export const STORAGE_URL = `${API_HOST}/storage`;

export function getStorageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  if (path.startsWith('/storage') || path.startsWith('storage')) {
    return `${STORAGE_URL}/${path.replace(/^\/storage\//, '')}`;
  }
  return `${STORAGE_URL}/${path}`;
}

export function getFullUrl(path: string | null | undefined): string | null {
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

export async function downloadBlob(url: string, options: RequestInit = {}): Promise<Blob> {
  const token = localStorage.getItem("token");
  const response = await fetch(getFullUrl(url) || url, {
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
