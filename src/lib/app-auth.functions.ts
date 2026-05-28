import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createSignedAppSessionToken, verifySignedAppSessionToken } from "@/lib/app-session-token";

const SESSION_TTL_DAYS = 30;

function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [salt, expected] = storedHash.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

function sessionExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);
  return expiresAt;
}

async function createSession(user: {
  id: string;
  email: string;
  fullName: string | null;
  isPlatformAdmin: boolean;
}) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = sessionExpiry();

  const { error } = await supabaseAdmin.from("app_sessions").insert({
    token,
    user_id: user.id,
    expires_at: expiresAt.toISOString(),
  });
  const sessionToken = error
    ? createSignedAppSessionToken({
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        isPlatformAdmin: user.isPlatformAdmin,
        expiresAt: expiresAt.toISOString(),
      })
    : token;

  return {
    token: sessionToken,
    expiresAt: expiresAt.toISOString(),
    user: {
      id: user.id,
      email: user.email,
      user_metadata: { full_name: user.fullName },
      isPlatformAdmin: user.isPlatformAdmin,
    },
  };
}

const LoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

function isBootstrapAdminLogin(email: string, password: string) {
  const bootstrapEmail = (process.env.APP_BOOTSTRAP_ADMIN_EMAIL || "panupong.chinn@gmail.com").toLowerCase();
  const bootstrapPassword = process.env.APP_BOOTSTRAP_ADMIN_PASSWORD || "123456789";
  return email === bootstrapEmail && password === bootstrapPassword;
}

export const signInWithAppAuth = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => LoginSchema.parse(d))
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase();
    const { data: signupAccount, error: signupError } = await supabaseAdmin
      .from("signup_accounts")
      .select("id,app_user_id,email,password_hash,is_active,full_name")
      .eq("email", email)
      .maybeSingle();

    if (signupError) throw new Error(signupError.message);

    if (signupAccount && signupAccount.is_active && verifyPassword(data.password, signupAccount.password_hash)) {
      return createSession({
        id: signupAccount.app_user_id,
        email: signupAccount.email,
        fullName: signupAccount.full_name ?? null,
        isPlatformAdmin: false,
      });
    }

    const { data: account, error } = await supabaseAdmin
      .from("app_users")
      .select("id,user_id,email,password_hash,is_active,full_name")
      .eq("email", email)
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (!account || !account.is_active || !verifyPassword(data.password, account.password_hash)) {
      if (!isBootstrapAdminLogin(email, data.password)) {
        throw new Error("Invalid login credentials");
      }

      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id,email,full_name")
        .eq("email", email)
        .maybeSingle();
      if (profileError) throw new Error(profileError.message);
      if (!profile) throw new Error("Invalid login credentials");

      const { data: platformAdmin } = await supabaseAdmin
        .from("platform_admins")
        .select("id,is_active")
        .eq("user_id", profile.id)
        .eq("is_active", true)
        .maybeSingle();

      return createSession({
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name ?? null,
        isPlatformAdmin: !!platformAdmin,
      });
    }

    const sessionUserId = account.user_id ?? account.id;
    const fullName = account.full_name ?? null;
    const { data: platformAdmin } = account.user_id
      ? await supabaseAdmin
          .from("platform_admins")
          .select("id,is_active")
          .eq("user_id", account.user_id)
          .eq("is_active", true)
          .maybeSingle()
      : { data: null };

    return createSession({
      id: sessionUserId,
      email: account.email,
      fullName,
      isPlatformAdmin: !!platformAdmin,
    });
  });

const SignupSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  company: z.string().trim().min(1).max(160),
  phone: z.string().trim().min(1).max(40),
  address: z.string().trim().min(1).max(500),
  email: z.string().trim().email().max(160),
  password: z.string().min(6).max(128),
});

export const signUpWithTrial = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SignupSchema.parse(d))
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase();
    const passwordHash = hashPassword(data.password);

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("signup_accounts")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existingError) {
      throw new Error(existingError.message);
    }
    if (existing) {
      throw new Error("Email already exists");
    }

    const { data: existingAppUser, error: duplicateAppUserError } = await supabaseAdmin
      .from("app_users")
      .select("id,organization_id")
      .eq("email", email)
      .maybeSingle();
    if (duplicateAppUserError) {
      throw new Error(duplicateAppUserError.message);
    }

    let organizationId = existingAppUser?.organization_id ?? null;

    if (organizationId) {
      const { error: organizationUpdateError } = await supabaseAdmin
        .from("organizations")
        .update({
          name: data.company,
          address: data.address,
          phone: data.phone,
          email,
          contact_name: data.fullName,
          status: "trial",
        })
        .eq("id", organizationId);
      if (organizationUpdateError) {
        throw new Error(organizationUpdateError.message);
      }
    } else {
      const { data: organization, error: organizationError } = await supabaseAdmin
        .from("organizations")
        .insert({
          name: data.company,
          address: data.address,
          phone: data.phone,
          email,
          contact_name: data.fullName,
          status: "trial",
        })
        .select("id")
        .single();
      if (organizationError) {
        throw new Error(organizationError.message);
      }
      organizationId = organization.id;
    }

    const { data: starterPlan } = await supabaseAdmin
      .from("subscription_plans")
      .select("id")
      .eq("code", "starter")
      .maybeSingle();

    if (starterPlan?.id) {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 15);

      const { data: existingSubscription, error: existingSubscriptionError } = await supabaseAdmin
        .from("organization_subscriptions")
        .select("id")
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (existingSubscriptionError) {
        throw new Error(existingSubscriptionError.message);
      }

      if (!existingSubscription) {
        const { error: subscriptionError } = await supabaseAdmin.from("organization_subscriptions").insert({
          organization_id: organizationId,
          plan_id: starterPlan.id,
          status: "trial",
          billing_cycle: "monthly",
          monthly_price: 0,
          start_date: new Date().toISOString().slice(0, 10),
          next_billing_date: trialEndsAt.toISOString().slice(0, 10),
          trial_ends_at: trialEndsAt.toISOString().slice(0, 10),
        });

        if (subscriptionError) {
          throw new Error(subscriptionError.message);
        }
      }
    }

    const appUserMutation = existingAppUser
      ? supabaseAdmin
          .from("app_users")
          .update({
            full_name: data.fullName,
            email,
            password_hash: passwordHash,
            role: "company_admin",
            organization_id: organizationId,
            is_active: true,
          })
          .eq("id", existingAppUser.id)
          .select("id,email,full_name")
          .single()
      : supabaseAdmin
          .from("app_users")
          .insert({
            full_name: data.fullName,
            email,
            password_hash: passwordHash,
            role: "company_admin",
            organization_id: organizationId,
            is_active: true,
          })
          .select("id,email,full_name")
          .single();

    const { data: appUser, error: appUserError } = await appUserMutation;
    if (appUserError) {
      throw new Error(appUserError.message);
    }

    const { error: signupAccountError } = await supabaseAdmin.from("signup_accounts").insert({
      app_user_id: appUser.id,
      organization_id: organizationId,
      full_name: data.fullName,
      company: data.company,
      phone: data.phone,
      address: data.address,
      email,
      password_hash: passwordHash,
      role: "company_admin",
      is_active: true,
    });
    if (signupAccountError) {
      throw new Error(signupAccountError.message);
    }

    return createSession({
      id: appUser.id,
      email,
      fullName: data.fullName,
      isPlatformAdmin: false,
    });
  });

const SessionSchema = z.object({
  token: z.string().min(1),
});

export const signOutAppSession = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SessionSchema.parse(d))
  .handler(async ({ data }) => {
    if (verifySignedAppSessionToken(data.token)) return { ok: true };
    await supabaseAdmin.from("app_sessions").delete().eq("token", data.token);
    return { ok: true };
  });

const ChangePasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6).max(128),
});

export const changeAppPassword = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ChangePasswordSchema.parse(d))
  .handler(async ({ data }) => {
    const signedSession = verifySignedAppSessionToken(data.token);
    if (signedSession) {
      throw new Error("Password changes require database sessions to be enabled.");
    }

    const { data: session, error } = await supabaseAdmin
      .from("app_sessions")
      .select("user_id, expires_at")
      .eq("token", data.token)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!session) throw new Error("Unauthorized");
    if (new Date(session.expires_at).getTime() <= Date.now()) throw new Error("Session expired");

    const { error: updateError } = await supabaseAdmin
      .from("app_users")
      .update({ password_hash: hashPassword(data.password) })
      .eq("user_id", session.user_id);

    if (updateError) throw new Error(updateError.message);
    return { ok: true };
  });
