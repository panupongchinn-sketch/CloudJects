import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SignUpSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  company: z.string().trim().min(1).max(160),
  phone: z.string().trim().min(1).max(40),
  address: z.string().trim().min(1).max(500),
  email: z.string().trim().email().max(160),
  password: z.string().min(6).max(128),
});

export const signUpWithTrial = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SignUpSchema.parse(d))
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase();

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName,
        company_name: data.company,
        phone_number: data.phone,
        company_address: data.address,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!created.user) {
      throw new Error("Unable to create user");
    }

    return {
      userId: created.user.id,
      email,
      trialDays: 15,
    };
  });
