// utils/axiosConfig.js
import axios from "axios";

const createAxiosInstance = () => {
  const instance = axios.create({
    baseURL: process.env.REACT_APP_BACKEND_URL,
  });

  // Request interceptor to add token
  instance.interceptors.request.use(
    (config) => {
      const user = JSON.parse(localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY));
      if (user?.token) {
        config.headers.Authorization = user.token;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Token expired or invalid
        localStorage.removeItem(process.env.REACT_APP_LOCALHOST_KEY);
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

export default createAxiosInstance;