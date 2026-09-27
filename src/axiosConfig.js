import axios from "axios";

const api = axios.create({
  baseURL: "http://192.168.0.2/hr-app/public/api",
  headers: { "Accept": "application/json" }
});

export default api;