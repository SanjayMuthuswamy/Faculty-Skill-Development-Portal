import axios, { AxiosInstance } from 'axios'
import { storage } from '../storage/storage'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const http: AxiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to attach authorization header
http.interceptors.request.use(
  (config) => {
    const token = storage.getAccessToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Response interceptor for error handling
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      storage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default http
