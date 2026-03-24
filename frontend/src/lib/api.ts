import axios, { type AxiosError } from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor — attach JWT
apiClient.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('nutriscan-auth')
    if (stored) {
      const { state } = JSON.parse(stored)
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`
      }
    }
  } catch {
    // ignore
  }
  return config
})

// Response interceptor — handle 401
// Only redirect to /login for 401s on protected routes (not on auth endpoints themselves)
apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const url = error.config?.url ?? ''
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/signup') || url.includes('/auth/forgot')
    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('nutriscan-auth')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const extractError = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as Record<string, unknown>
    if (data?.error) return data.error as string
    if (data?.message) return data.message as string
    if (Array.isArray(data?.errors)) {
      const e = data.errors as Array<{ msg: string }>
      return e[0]?.msg || 'Validation error'
    }
    if (err.message === 'Network Error') return 'Cannot connect to server. Please try again.'
    if (err.code === 'ECONNABORTED') return 'Request timed out. Please try again.'
  }
  if (err instanceof Error) return err.message
  return 'An unexpected error occurred'
}
