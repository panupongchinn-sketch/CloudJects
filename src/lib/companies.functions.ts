import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifySignedAppSessionToken } from "@/lib/app-session-token";

const ORG_STATUS_VALUES = ["active", "trial", "suspended", "cancelled", "expired"] as const;

const CompanyInputSchema = z.object({
  token: z.string().min(1),
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  contactName: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(500).optional(),
  status: z.enum(ORG_STATUS_VALUES),
  planId: z.string().uuid().nullable().optional(),
});

const DeleteCompanySchema = z.object({
  token: z.string().min(1),
  id: z.string().uuid(),
});

async function resolveActorSession(token: string) {
  const signedSession = verifySignedAppSessionToken(token);
  if (signedSession) {
    return { userId: signedSession.userId };
  }

  const { data: session, error } = await supabaseAdmin
    .from("app_sessions")
    .select("user_id, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!session) throw new Error("Unauthorized");
  if (new Date(session.expires_at).getTime() <= Date.now()) throw new Error("Session expired");

  return { userId: session.user_id };
}

async function requirePlatformAdmin(token: string) {
  const session = await resolveActorSession(token);
  const { data, error } = await supabaseAdmin
    .from("platform_admins")
    .select("id")
    .eq("user_id", session.userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Unauthorized");

  return session;
}

function subscriptionStatusForOrg(status: (typeof ORG_STATUS_VALUES)[number]) {
  if (status === "active" || status === "trial" || status === "suspended" || status === "expired") return status;
  return "cancelled";
}

async function upsertSubscription(organizationId: string, planId: string | null | undefined, status: (typeof ORG_STATUS_VALUES)[number]) {
  if (!planId) return;

  const { data: plan, error: planError } = await supabaseAdmin
    .from("subscription_plans")
    .select("id,monthly_price")
    .eq("id", planId)
    .maybeSingle();

  if (planError) throw new Error(planError.message);
  if (!plan) throw new Error("Plan not found");

  const { data: subscription, error: subscriptionError } = await supabaseAdmin
    .from("organization_subscriptions")
    .select("id")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscriptionError) throw new Error(subscriptionError.message);

  const payload = {
    plan_id: plan.id,
    monthly_price: Number(plan.monthly_price ?? 0),
    status: subscriptionStatusForOrg(status) as any,
    next_billing_date: status === "trial" ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  };

  const result = subscription
    ? await supabaseAdmin.from("organization_subscriptions").update(payload).eq("id", subscription.id)
    : await supabaseAdmin.from("organization_subscriptions").insert({
        organization_id: organizationId,
        ...payload,
      });

  if (result.error) throw new Error(result.error.message);
}

export const saveCompany = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CompanyInputSchema.parse(d))
  .handler(async ({ data }) => {
    await requirePlatformAdmin(data.token);

    const payload = {
      name: data.name,
      email: data.email || null,
      contact_name: data.contactName || null,
      phone: data.phone || null,
      address: data.address || null,
      status: data.status as any,
    };

    const result = data.id
      ? await supabaseAdmin.from("organizations").update(payload).eq("id", data.id).select("id").single()
      : await supabaseAdmin.from("organizations").insert(payload).select("id").single();

    if (result.error) throw new Error(result.error.message);
    if (!result.data?.id) throw new Error("Unable to save company");

    await upsertSubscription(result.data.id, data.planId, data.status);

    return { id: result.data.id as string };
  });

export const deleteCompany = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => DeleteCompanySchema.parse(d))
  .handler(async ({ data }) => {
    await requirePlatformAdmin(data.token);

    if (data.id === "00000000-0000-0000-0000-000000000001") {
      throw new Error("Default organization cannot be deleted");
    }

    const { error } = await supabaseAdmin.from("organizations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
