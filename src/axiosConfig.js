import axios from "axios";

const api = axios.create({
  baseURL: "http://server/hr-app/public/api",
  headers: { "Accept": "application/json" }
});

export default api;