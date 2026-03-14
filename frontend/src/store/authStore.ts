import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'
import { authService } from '../services/api'

interface AuthStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  setUser: (user: User) => void
  setToken: (token: string) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const data = await authService.login(email, password)
          set({
            user: data.user,
            token: data.accessToken,
            isAuthenticated: true,
            isLoading: false
          })
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      signup: async (email, password, name) => {
        set({ isLoading: true })
        try {
          const data = await authService.signup(email, password, name)
          set({
            user: data.user,
            token: data.accessToken,
            isAuthenticated: true,
            isLoading: false
          })
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false })
      },

      setUser: (user) => set({ user }),
      setToken: (token) => set({ token, isAuthenticated: true })
    }),
    {
      name: 'nutriscan-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)
