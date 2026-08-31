import { createContext, useCallback, useEffect, useState } from "react";
import { api, getToken, setToken } from "../api/client";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.get("/api/auth/me");
      setUser(me);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = useCallback(async (email, password) => {
    const { token, user: loggedUser } = await api.post("/api/auth/login", { email, password });
    setToken(token);
    setUser(loggedUser);
  }, []);

  const register = useCallback(async (email, password, fullName) => {
    const { token, user: newUser } = await api.post("/api/auth/register", { email, password, fullName });
    setToken(token);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
