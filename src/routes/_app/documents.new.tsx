import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/documents/new")({
  validateSearch: (s: Record<string, unknown>) => ({
    template_id: typeof s.template_id === "string" ? s.template_id : undefined,
    projectId: typeof s.projectId === "string" ? s.projectId : undefined,
  }),
  beforeLoad: ({ search }) => {
    if (search.template_id) {
      throw redirect({
        to: "/templates/$id/use",
        params: { id: search.template_id },
        search: search.projectId ? { projectId: search.projectId } : {},
      });
    }
    throw redirect({ to: "/templates" });
  },
});
