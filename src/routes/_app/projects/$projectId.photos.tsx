import { useEffect, useState } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { Upload, Camera, Filter } from "lucide-react";
import { fetchProjectBundle, initials, photoUrl } from "@/lib/app-data";

const CATEGORIES = ["All", "Project Photos"] as const;

export const Route = createFileRoute("/_app/projects/$projectId/photos")({
  component: PhotosPage,
});

function PhotosPage() {
  const { projectId } = useParams({ from: "/_app/projects/$projectId/photos" });
  const [bundle, setBundle] = useState<NonNullable<Awaited<ReturnType<typeof fetchProjectBundle>>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchProjectBundle(projectId).then((result) => {
      if (!cancelled) setBundle(result);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const items = bundle?.photos ?? [];

  return (
    <section className="space-y-4">
      <div className="card-surface p-3 lg:p-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 overflow-x-auto -mx-1 px-1 flex-1 min-w-0">
          {CATEGORIES.map((category, index) => (
            <button
              key={category}
              className={
                "shrink-0 h-9 px-3 rounded-lg text-sm whitespace-nowrap " +
                (index === 0
                  ? "bg-primary text-primary-foreground font-medium"
                  : "border border-border bg-background text-muted-foreground hover:bg-accent")
              }
            >
              {category}
            </button>
          ))}
        </div>
        <button className="h-9 px-3 rounded-lg border border-border bg-background text-sm inline-flex items-center gap-1.5">
          <Filter className="h-4 w-4" /> Filter
        </button>
        <button className="h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1.5 hover:bg-primary-hover">
          <Camera className="h-4 w-4" /> ถ่ายรูป
        </button>
        <button className="h-9 px-3.5 rounded-lg border border-border bg-background text-sm font-medium inline-flex items-center gap-1.5">
          <Upload className="h-4 w-4" /> อัปโหลด
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {!bundle ? (
          <Empty />
        ) : items.length === 0 ? (
          <Empty text="ยังไม่มีรูปภาพในฐานข้อมูล" />
        ) : (
          items.map((photo) => {
            const uploader = photo.uploader_id ? bundle.profiles.get(photo.uploader_id) : null;
            return (
              <figure key={photo.id} className="card-surface overflow-hidden p-0 group cursor-pointer">
                <div className="aspect-square overflow-hidden">
                  <img
                    src={photoUrl(photo.storage_path)}
                    alt={photo.caption ?? "Project photo"}
                    className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform"
                  />
                </div>
                <figcaption className="p-2.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] uppercase tracking-wide font-medium text-primary">Photo</span>
                    <span className="text-[10px] text-muted-foreground">{photo.created_at?.slice(0, 10)}</span>
                  </div>
                  <div className="mt-0.5 text-sm font-medium truncate">{photo.caption ?? "-"}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {uploader?.full_name ?? uploader?.email ?? initials(null, photo.uploader_id)}
                  </div>
                </figcaption>
              </figure>
            );
          })
        )}
      </div>
    </section>
  );
}

function Empty({ text = "กำลังโหลดรูปภาพ..." }: { text?: string }) {
  return (
    <div className="col-span-full card-surface p-10 text-center">
      <Camera className="h-10 w-10 mx-auto text-muted-foreground/40" />
      <h3 className="mt-3 font-medium">{text}</h3>
    </div>
  );
}
