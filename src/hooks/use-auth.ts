import { useEffect, useState } from "react";
import {
  APP_AUTH_EVENT,
  clearStoredAppSession,
  getStoredAppSession,
  type AppSessionUser,
} from "@/lib/app-auth-client";
import { signOutAppSession } from "@/lib/app-auth.functions";

export interface AuthState {
  session: { token: string; expiresAt: string } | null;
  user: AppSessionUser | null;
  loading: boolean;
}

function readState(): AuthState {
  const session = getStoredAppSession();
  return {
    session: session ? { token: session.token, expiresAt: session.expiresAt } : null,
    user: session?.user ?? null,
    loading: false,
  };
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>(() => ({
    session: null,
    user: null,
    loading: typeof window === "undefined",
  }));

  useEffect(() => {
    const sync = () => setState(readState());
    sync();
    window.addEventListener(APP_AUTH_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(APP_AUTH_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return state;
}

export async function signOut() {
  const session = getStoredAppSession();
  clearStoredAppSession();
  if (session?.token) {
    try {
      await signOutAppSession({ data: { token: session.token } });
    } catch {
      // Ignore stale or already-removed sessions.
    }
  }
}
