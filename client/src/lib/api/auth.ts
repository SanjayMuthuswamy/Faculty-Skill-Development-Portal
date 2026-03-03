import http from './http'
import { storage } from '../storage/storage'

interface LoginRequest {
  email: string
  password: string
}

interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

interface UserResponse {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'FACULTY'
  is_active: boolean
  created_at: string
}

export const authApi = {
  login: async (email: string, password: string): Promise<TokenResponse> => {
    const response = await http.post<TokenResponse>('/api/v1/auth/login', {
      email,
      password,
    })
    return response.data
  },

  getMe: async (): Promise<UserResponse> => {
    const response = await http.get<UserResponse>('/api/v1/auth/me')
    return response.data
  },

  logout: (): void => {
    storage.clear()
  },
}
