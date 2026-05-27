import { useEffect, useState } from "react";
import {
  APP_AUTH_EVENT,
  clearStoredAppSession,
  getStoredAppSession,
  type AppSessionUser,
} from "@/lib/app-auth-client";
import { signOutAppSession } from "@/lib/app-auth.functions";
import { supabase } from "@/integrations/supabase/client";

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
  const [state, setState] = useState<AuthState>(() =>
    typeof window === "undefined"
      ? {
          session: null,
          user: null,
          loading: true,
        }
      : readState(),
  );

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

  try {
    await supabase.auth.signOut();
  } catch {
    // App-managed auth is authoritative; ignore stale Supabase auth state.
  }

  if (session?.token) {
    void signOutAppSession({ data: { token: session.token } }).catch(() => {
      // Ignore stale or already-removed sessions.
    });
  }
}
