// Storage utility functions
const TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const USER_KEY = 'user'

export const storage = {
  setAccessToken: (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token)
  },

  getAccessToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY)
  },

  setRefreshToken: (token: string): void => {
    localStorage.setItem(REFRESH_TOKEN_KEY, token)
  },

  getRefreshToken: (): string | null => {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  },

  setUser: (user: unknown): void => {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },

  getUser: (): unknown | null => {
    const user = localStorage.getItem(USER_KEY)
    return user ? JSON.parse(user) : null
  },

  clear: (): void => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },
}
