import axios from "axios";

/**
 * Cliente HTTP conectado directamente al backend FastAPI (local o AWS EC2).
 * No utiliza mocks en memoria: todas las categorías, objetos y entidades
 * provienen estrictamente de la base de datos SQL Server / AWS RDS.
 */
const API_URL =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:8000";

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

export { API_URL };
export default axiosInstance;
export { axiosInstance as apiClient };
