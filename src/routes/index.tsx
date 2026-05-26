import { createFileRoute, redirect } from "@tanstack/react-router";
import { getStoredAppSession } from "@/lib/app-auth-client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") {
      throw redirect({ to: "/login" });
    }
    const session = getStoredAppSession();
    throw redirect({ to: session ? "/dashboard" : "/login" });
  },
});
