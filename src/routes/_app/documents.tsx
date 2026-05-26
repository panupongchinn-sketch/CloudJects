import { createFileRoute } from "@tanstack/react-router";
import { DocumentList } from "@/components/documents/document-list";
import { Header } from "@/components/layout/header";

export const Route = createFileRoute("/_app/documents")({
  component: DocumentsHubPage,
});

function DocumentsHubPage() {
  return (
    <>
      <Header
        title="เอกสารทั้งหมด"
        subtitle="รวมเอกสารทุกโครงการของบริษัท"
      />
      <main className="flex-1 p-4 lg:p-6">
        <DocumentList showProjectColumn />
      </main>
    </>
  );
}
