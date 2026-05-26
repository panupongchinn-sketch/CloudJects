import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Upload } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProjects, type MyProject } from "@/lib/portal-data";
import { toast } from "sonner";
import { CloudJectLoading } from "@/components/loading/cloudject-loading";

export const Route = createFileRoute("/_app/portal/photos")({
  component: PhotosUploadPage,
});

type Photo = {
  id: string;
  project_id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
  url?: string;
};

const BUCKET = "project-photos";

function PhotosUploadPage() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [projects, setProjects] = useState<MyProject[]>([]);
  const [projectId, setProjectId] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [recent, setRecent] = useState<Photo[]>([]);

  const load = async () => {
    if (!user) return;
    setBusy(true);
    const ps = await fetchMyProjects(user.id);
    setProjects(ps);
    if (ps.length && !projectId) setProjectId(ps[0].id);

    const { data } = await supabase
      .from("photos")
      .select("id, project_id, storage_path, caption, created_at")
      .eq("uploader_id", user.id)
      .order("created_at", { ascending: false })
      .limit(24);
    setRecent((data ?? []).map((p) => ({
      ...p,
      url: supabase.storage.from(BUCKET).getPublicUrl(p.storage_path).data.publicUrl,
    })));
    setBusy(false);
  };

  useEffect(() => {
    void load();
  }, [user]);

  const onUpload = async (files: FileList | null) => {
    if (!files || !files.length || !user || !projectId) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${projectId}/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (upErr) throw upErr;
        const { error: dbErr } = await supabase.from("photos").insert({
          project_id: projectId,
          uploader_id: user.id,
          storage_path: path,
          caption: caption || file.name,
          taken_at: new Date().toISOString(),
        });
        if (dbErr) throw dbErr;
      }
      toast.success(`อัปโหลด ${files.length} รูปสำเร็จ`);
      setCaption("");
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "อัปโหลดล้มเหลว");
    } finally {
      setUploading(false);
    }
  };

  if (busy) return <CloudJectLoading />;

  return (
    <div className="space-y-4">
      <div className="card-surface space-y-3 p-5">
        <h2 className="flex items-center gap-2 font-semibold"><Camera className="h-4 w-4 text-primary" /> อัปโหลดรูปหน้างาน</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs text-muted-foreground">โครงการ</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
              <option value="" disabled>เลือกโครงการ</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">คำอธิบาย</label>
            <input value={caption} onChange={(e) => setCaption(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </div>
        </div>

        <label className="block">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => void onUpload(e.target.files)} disabled={uploading || !projectId} />
          <span className={"flex h-24 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed text-sm " + (uploading ? "border-muted text-muted-foreground" : "border-primary/40 text-primary hover:bg-primary/5")}>
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            {uploading ? "กำลังอัปโหลด..." : "แตะเพื่อถ่ายรูป หรือเลือกไฟล์จากเครื่อง"}
          </span>
        </label>
      </div>

      <div className="card-surface p-5">
        <h3 className="mb-3 text-sm font-semibold">รูปล่าสุดที่ฉันอัปโหลด</h3>
        {recent.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">ยังไม่มีรูป</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {recent.map((p) => (
              <figure key={p.id} className="overflow-hidden rounded-lg border border-border bg-muted">
                <div className="aspect-square">
                  <img src={p.url} alt={p.caption ?? ""} className="h-full w-full object-cover" />
                </div>
                <figcaption className="truncate p-2 text-[11px]">{p.caption ?? "-"}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
