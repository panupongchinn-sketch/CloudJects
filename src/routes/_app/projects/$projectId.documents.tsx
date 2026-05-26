import { createFileRoute } from "@tanstack/react-router";
import { DocumentList } from "@/components/documents/document-list";

export const Route = createFileRoute("/_app/projects/$projectId/documents")({
  component: DocumentsPage,
});

function DocumentsPage() {
  const { projectId } = Route.useParams();
  return <DocumentList projectId={projectId} />;
}
