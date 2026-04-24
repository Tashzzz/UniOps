import axios from 'axios'
import { getSessionUser } from '../context/AuthContext'

const RAW_API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081'

export const resolveMediaUrl = (url) => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('/uploads')) return `${RAW_API_BASE}${url}`
  return url
}

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message
    return Promise.reject(new Error(message))
  }
)

api.interceptors.request.use((config) => {
  const user = getSessionUser()
  if (user?.email) {
    config.headers['X-User-Email'] = user.email
  }
  return config
})

export default api