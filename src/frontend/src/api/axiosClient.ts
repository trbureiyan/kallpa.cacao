import axios from 'axios';

// URL base apuntando al backend de FastAPI de tu compañero
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 segundos de tiempo máximo de espera
});