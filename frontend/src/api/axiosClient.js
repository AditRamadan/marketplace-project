// src/api/axiosClient.js
import axios from "axios";

const axiosClient = axios.create({
  baseURL: "http://127.0.0.1:8000/api", // Sesuaikan dengan URL base API backend Anda
  headers: {
    "Content-Type": "application/json",
  },
});

// 1. Request Interceptor: Otomatis tambahkan Authorization Header (JWT Access Token)
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 2. Response Interceptor: Tangkap error 401 (Token Expired / Invalid) -> AUTO LOGOUT
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Hapus data sesi di localStorage
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user_data");

      // Notifikasi opsional (bisa diaktifkan jika perlu)
      console.warn(
        "Sesi login telah berakhir. Anda dialihkan ke halaman login.",
      );

      // Reset URL dan redirect ke halaman auth/login
      if (window.location.pathname !== "/" || window.location.search !== "") {
        window.location.href = "/";
      } else {
        window.location.reload();
      }
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
