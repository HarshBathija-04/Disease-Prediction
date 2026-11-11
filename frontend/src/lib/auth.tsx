import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, onAuthLost, tokens } from "./api";
import type { AuthResponse, User } from "./types";

type AuthState = {
  user: User | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<User>;
  register: (payload: Record<string, unknown>) => Promise<User>;
  logout: () => void;
  setUser: (user: User) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(() => !tokens.get());

  useEffect(() => {
    onAuthLost(() => setUser(null));
    if (!tokens.get()) return;
    api<User>("/api/auth/me")
      .then(setUser)
      .catch(() => tokens.set(null))
      .finally(() => setReady(true));
  }, []);

  const accept = useCallback((data: AuthResponse) => {
    tokens.set({ access: data.access, refresh: data.refresh });
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      ready,
      setUser,
      login: (username, password) =>
        api<AuthResponse>("/api/auth/login", {
          method: "POST",
          body: { username, password },
          auth: false,
        }).then(accept),
      register: (payload) =>
        api<AuthResponse>("/api/auth/register", { method: "POST", body: payload, auth: false }).then(accept),
      logout: () => {
        tokens.set(null);
        setUser(null);
      },
    }),
    [user, ready, accept],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
