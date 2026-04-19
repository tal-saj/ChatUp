// utils/axiosConfig.js
import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL,
});

api.interceptors.request.use((config) => {
  try {
    const user = JSON.parse(localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY));
    if (user?.token) config.headers.Authorization = `Bearer ${user.token}`;
  } catch {}
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(process.env.REACT_APP_LOCALHOST_KEY);
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;