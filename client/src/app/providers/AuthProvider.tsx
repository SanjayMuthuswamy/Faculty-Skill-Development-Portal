import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authApi } from '@/lib/api/auth'
import { storage } from '@/lib/storage/storage'

interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'FACULTY'
  is_active: boolean
  created_at: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setUser: (user: User | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      const token = storage.getAccessToken()
      if (token) {
        try {
          const currentUser = await authApi.getMe()
          setUser(currentUser)
          storage.setUser(currentUser)
        } catch (error) {
          console.error('Failed to load user:', error)
          storage.clear()
        }
      }
      setIsLoading(false)
    }

    loadUser()
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const tokens = await authApi.login(email, password)
      storage.setAccessToken(tokens.access_token)
      storage.setRefreshToken(tokens.refresh_token)

      const currentUser = await authApi.getMe()
      setUser(currentUser)
      storage.setUser(currentUser)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    authApi.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
