export const APP_SESSION_STORAGE_KEY = "cloudject_app_session";
export const APP_AUTH_EVENT = "cloudject-app-auth-changed";

export type AppSessionUser = {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string | null;
  };
  isPlatformAdmin?: boolean;
};

export type StoredAppSession = {
  token: string;
  user: AppSessionUser;
  expiresAt: string;
};

export function getStoredAppSession(): StoredAppSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(APP_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAppSession;
    if (!parsed?.token || !parsed?.user?.id || !parsed?.expiresAt) return null;
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
      window.localStorage.removeItem(APP_SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setStoredAppSession(session: StoredAppSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(APP_SESSION_STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(APP_AUTH_EVENT));
}

export function clearStoredAppSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(APP_SESSION_STORAGE_KEY);
  window.dispatchEvent(new Event(APP_AUTH_EVENT));
}

export function getAppSessionToken() {
  return getStoredAppSession()?.token ?? null;
}
