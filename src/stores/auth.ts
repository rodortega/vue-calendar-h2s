import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authAPI, type LoginCredentials, type LoginResponse } from '@/services/api'

export const useAuthStore = defineStore('auth', () => {
  // State
  const token = ref<string | null>(localStorage.getItem('auth-token'))
  const refreshToken = ref<string | null>(localStorage.getItem('refresh-token'))
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const isAuthenticated = computed(() => !!token.value)

  // Actions
  const login = async (credentials: LoginCredentials): Promise<void> => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await authAPI.login(credentials)
      const data: LoginResponse = response.data
      
      token.value = data.token
      refreshToken.value = data.refreshToken
      
      // Store in localStorage
      localStorage.setItem('auth-token', data.token)
      localStorage.setItem('refresh-token', data.refreshToken)
      
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Login failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const logout = (): void => {
    token.value = null
    refreshToken.value = null
    
    // Remove from localStorage
    localStorage.removeItem('auth-token')
    localStorage.removeItem('refresh-token')
    
    error.value = null
  }

  const refresh = async (): Promise<void> => {
    if (!refreshToken.value) {
      logout()
      return
    }

    try {
      const response = await authAPI.refreshToken(refreshToken.value)
      const data: LoginResponse = response.data
      
      token.value = data.token
      refreshToken.value = data.refreshToken
      
      localStorage.setItem('auth-token', data.token)
      localStorage.setItem('refresh-token', data.refreshToken)
      
    } catch (err) {
      logout()
      throw err
    }
  }

  const clearError = (): void => {
    error.value = null
  }

  return {
    token,
    refreshToken,
    isLoading,
    error,
    isAuthenticated,
    login,
    logout,
    refresh,
    clearError
  }
})