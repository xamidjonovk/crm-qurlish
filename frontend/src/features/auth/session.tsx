"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, restoreSession, setTokens } from "@/lib/api";
import { SWRConfig } from "swr";
import type { User } from "@/lib/types";
const Context = createContext<{
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: (all?: boolean) => Promise<void>;
}>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    restoreSession();
    let active = true;
    api<User>("/api/v1/auth/me")
      .then((user) => {
        if (active) setUser(user);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    const clear = () => setUser(null);
    window.addEventListener("crm:logout", clear);
    return () => {
      active = false;
      window.removeEventListener("crm:logout", clear);
    };
  }, []);
  async function login(username: string, password: string) {
    const tokens = await api<{ access_token: string; refresh_token: string }>(
      "/api/v1/auth/login",
      { method: "POST", body: new URLSearchParams({ username, password }) },
      false,
    );
    setTokens(tokens);
    setUser(await api<User>("/api/v1/auth/me"));
  }
  async function logout(all = false) {
    if (all) await api("/api/v1/auth/logout-all", { method: "POST" });
    setTokens(null);
    setUser(null);
  }
  return (
    <Context.Provider value={{ user, loading, login, logout }}>
      <SWRConfig
        key={user?.id ?? "guest"}
        value={{ provider: () => new Map(), shouldRetryOnError: false }}
      >
        {children}
      </SWRConfig>
    </Context.Provider>
  );
}
export const useSession = () => useContext(Context);
