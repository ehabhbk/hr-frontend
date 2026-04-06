import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost/hr-app/public/api",
  headers: { "Accept": "application/json" },
});

export const API_BASE = "http://localhost/hr-app/public/api";

// Interceptor لإضافة التوكن في كل طلب
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

export default api;