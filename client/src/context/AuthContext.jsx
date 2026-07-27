import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { loginUser as apiLogin } from '../api/authApi';

const AuthContext = createContext(null);

const TOKEN_KEY = 'swl_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // { id, name, role }
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // initial session restore

  // ── Restore session on mount ──────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      try {
        const decoded = jwtDecode(stored);
        // Check expiry
        if (decoded.exp * 1000 > Date.now()) {
          setToken(stored);
          setUser({ id: decoded.id, name: decoded.name, role: decoded.role });
        } else {
          localStorage.removeItem(TOKEN_KEY);
        }
      } catch {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    setLoading(false);
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async ({ phone, password }) => {
    const data = await apiLogin({ phone, password });
    const { token: newToken, user: newUser } = data;
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
    return newUser;
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = { user, token, loading, login, logout, isAuthenticated: !!user };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
