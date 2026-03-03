import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../../lib/types';
import { authApi } from '../../lib/api/auth';
import { storage } from '../../lib/storage/storage';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Maps backend user response (uppercase roles, ISO dates) to frontend User type.
 * Defensive: returns a valid User even if backend shape differs slightly.
 */
function mapBackendUser(data: Record<string, unknown>): User {
  return {
    id: String(data.id ?? ''),
    name: String(data.name ?? ''),
    email: String(data.email ?? ''),
    role: String(data.role ?? 'FACULTY').toLowerCase() as User['role'],
    department: data.department != null ? String(data.department) : undefined,
    designation: data.designation != null ? String(data.designation) : undefined,
    experience: typeof data.experience === 'number' ? data.experience : undefined,
    joinedDate: data.created_at != null ? String(data.created_at) : undefined,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: if we have a stored access token, validate it by calling /me
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = storage.getAccessToken();
        if (!token) {
          setIsLoading(false);
          return;
        }

        // Validate token by fetching current user from backend
        const meData = await authApi.getMe();
        const restoredUser = mapBackendUser(meData as unknown as Record<string, unknown>);

        // Role consistency check: if localStorage has a different role than the server,
        // the user switched accounts without logging out. Clear everything and re-login.
        const cachedUser = storage.getUser() as { role?: string } | null;
        if (cachedUser?.role && cachedUser.role !== restoredUser.role) {
          console.warn(
            `Session role mismatch: cached='${cachedUser.role}' server='${restoredUser.role}'. Clearing session.`
          );
          storage.clear();
          setIsLoading(false);
          return; // User will be redirected to /login by ProtectedRoute
        }

        setUser(restoredUser);
        storage.setUser(restoredUser);
      } catch (error) {
        // Token expired or invalid — clear everything
        console.error('Session restore failed:', error);
        storage.clear();
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Step 1: Get tokens from backend
      const tokenResponse = await authApi.login(email, password);

      // Step 2: Store tokens
      storage.setAccessToken(tokenResponse.access_token);
      storage.setRefreshToken(tokenResponse.refresh_token);

      // Step 3: Fetch user profile using the new token
      const meData = await authApi.getMe();
      const loggedInUser = mapBackendUser(meData as unknown as Record<string, unknown>);

      // Step 4: Store user and update state
      storage.setUser(loggedInUser);
      setUser(loggedInUser);
    } catch (error: unknown) {
      // Normalize error for the UI
      storage.clear();

      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { detail?: string }; status?: number } };
        const detail = axiosError.response?.data?.detail;
        if (detail) {
          throw new Error(detail);
        }
        if (axiosError.response?.status === 401) {
          throw new Error('Invalid email or password');
        }
      }

      throw new Error('Login failed. Please check your connection and try again.');
    }
  };

  const logout = () => {
    setUser(null);
    storage.clear();
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
