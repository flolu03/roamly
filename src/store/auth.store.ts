import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import { login, register, logout } from '../api/auth.api'

interface User {
  id: string
  email: string
  displayName: string | null
}

interface AuthStore {
  user: User | null
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const data = await login(email, password)
      set({ user: data.user, isLoading: false })
    } catch (e: any) {
      set({ error: e.response?.data?.error || 'Login fehlgeschlagen', isLoading: false })
    }
  },

  register: async (email, password, displayName) => {
    set({ isLoading: true, error: null })
    try {
      const data = await register(email, password, displayName)
      set({ user: data.user, isLoading: false })
    } catch (e: any) {
      set({ error: e.response?.data?.error || 'Registrierung fehlgeschlagen', isLoading: false })
    }
  },

  logout: async () => {
    const refreshToken = await SecureStore.getItemAsync('refreshToken')
    if (refreshToken) await logout(refreshToken)
    set({ user: null })
  },

  clearError: () => set({ error: null })
}))