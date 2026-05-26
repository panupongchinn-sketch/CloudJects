import { createHmac, timingSafeEqual } from "node:crypto";

type SignedAppSessionPayload = {
  userId: string;
  email: string;
  fullName: string | null;
  isPlatformAdmin: boolean;
  expiresAt: string;
};

const TOKEN_PREFIX = "app1";

function tokenSecret() {
  const secret =
    process.env.APP_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!secret) throw new Error("Missing APP_SESSION_SECRET or Supabase key for app session signing.");
  return secret;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string) {
  return createHmac("sha256", tokenSecret()).update(payload).digest("base64url");
}

export function createSignedAppSessionToken(payload: SignedAppSessionPayload) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${TOKEN_PREFIX}.${encodedPayload}.${signPayload(encodedPayload)}`;
}

export function verifySignedAppSessionToken(token: string): SignedAppSessionPayload | null {
  const [prefix, encodedPayload, signature] = token.split(".");
  if (prefix !== TOKEN_PREFIX || !encodedPayload || !signature) return null;

  const expected = signPayload(encodedPayload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SignedAppSessionPayload;
    if (!payload.userId || !payload.email || !payload.expiresAt) return null;
    if (new Date(payload.expiresAt).getTime() <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
