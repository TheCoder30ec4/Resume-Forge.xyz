"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { getMe, User } from "./api";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  setTokens: (access: string, refresh: string) => Promise<"onboarding" | "dashboard">;
  signOut: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  setTokens: async () => "dashboard",
  signOut: () => {},
  refresh: async () => {},
});

/** Returns true if the user still needs to complete onboarding. */
function needsOnboarding(): boolean {
  if (localStorage.getItem("onboarding_done") === "1") return false;
  const repos: string[] = JSON.parse(localStorage.getItem("selected_repos") ?? "[]");
  const linkedinDone = localStorage.getItem("linkedin_connected") === "1";
  return repos.length < 2 || !linkedinDone;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) { setLoading(false); setUser(null); return; }
    try {
      const me = await getMe();
      setUser(me);
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function setTokens(access: string, refresh: string): Promise<"onboarding" | "dashboard"> {
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
    await load();
    return needsOnboarding() ? "onboarding" : "dashboard";
  }

  function signOut() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("linkedin_connected");
    // keep selected_repos so user doesn't re-add them if they log back in
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, setTokens, signOut, refresh: load }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export { needsOnboarding };
