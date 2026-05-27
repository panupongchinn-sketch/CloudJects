import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, MessageSquare, Send, X } from "lucide-react";
import { toast } from "sonner";
import { CloudJectLoading } from "@/components/loading/cloudject-loading";
import { useAuth } from "@/hooks/use-auth";
import { fetchProfileMap } from "@/lib/app-data";
import { getAppSessionToken } from "@/lib/app-auth-client";
import { listProjectChatMessages, sendProjectChatMessage } from "@/lib/chat.functions";
import { fetchMyProjects, type MyProject } from "@/lib/portal-data";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/portal/chat")({
  component: ChatPage,
});

type Msg = {
  id: string;
  body: string | null;
  image_path: string | null;
  sender_id: string | null;
  created_at: string;
  sender_name?: string;
  local_preview_url?: string | null;
};

type PendingImage = {
  file: File;
  previewUrl: string;
};

const CHAT_IMAGE_BUCKET = "chat-images";
const MAX_CHAT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

function chatImageUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("data:image/")) return path;
  return supabase.storage.from(CHAT_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Invalid image payload"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function ChatPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<MyProject[]>([]);
  const [projectId, setProjectId] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [selectedImage, setSelectedImage] = useState<PendingImage | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const ps = await fetchMyProjects(user.id);
      setProjects(ps);
      if (ps.length && !projectId) setProjectId(ps[0].id);
      setLoading(false);
    })();
  }, [user, projectId]);

  const loadMessages = async (pid: string) => {
    const token = getAppSessionToken();
    let rows: Msg[] = [];

    if (token) {
      const result = await listProjectChatMessages({
        data: { projectId: pid, limit: 100 },
        headers: { "x-app-session": token },
      });
      rows = ((result.messages ?? []) as Msg[]) ?? [];
    } else {
      const { data } = await supabase
        .from("chat_messages")
        .select("id, body, image_path, sender_id, created_at")
        .eq("project_id", pid)
        .order("created_at", { ascending: true })
        .limit(100);
      rows = ((data ?? []) as Msg[]) ?? [];
    }

    const ids = Array.from(new Set(rows.map((m) => m.sender_id).filter(Boolean))) as string[];
    const nameMap = new Map<string, string>();
    if (ids.length) {
      const profiles = await fetchProfileMap(ids);
      for (const [id, profile] of profiles.entries()) {
        nameMap.set(id, profile.full_name ?? profile.email ?? "");
      }
    }

    setMessages(rows.map((m) => ({ ...m, sender_name: nameMap.get(m.sender_id ?? "") ?? "-" })));
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  useEffect(() => {
    if (!projectId) return;
    void loadMessages(projectId);
    const ch = supabase
      .channel(`chat-${projectId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `project_id=eq.${projectId}` }, () => {
        void loadMessages(projectId);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [projectId]);

  useEffect(() => {
    return () => {
      if (selectedImage?.previewUrl) URL.revokeObjectURL(selectedImage.previewUrl);
    };
  }, [selectedImage]);

  const clearSelectedImage = () => {
    if (selectedImage?.previewUrl) URL.revokeObjectURL(selectedImage.previewUrl);
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onPickImage = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("เลือกได้เฉพาะไฟล์รูปภาพ");
      return;
    }
    if (file.size > MAX_CHAT_IMAGE_SIZE_BYTES) {
      toast.error("รูปต้องมีขนาดไม่เกิน 5 MB");
      return;
    }

    if (selectedImage?.previewUrl) URL.revokeObjectURL(selectedImage.previewUrl);
    setSelectedImage({ file, previewUrl: URL.createObjectURL(file) });
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!text.trim() && !selectedImage) || !projectId || !user || sending) return;

    const body = text.trim();
    const pendingImage = selectedImage;
    const optimisticId = `tmp-${Date.now()}`;
    let optimisticPreviewUrl = pendingImage?.previewUrl ?? null;

    setSending(true);
    setText("");
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    setMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        body: body || null,
        image_path: null,
        sender_id: user.id,
        created_at: new Date().toISOString(),
        sender_name: user.user_metadata?.full_name ?? user.email ?? "",
        local_preview_url: optimisticPreviewUrl,
      },
    ]);

    try {
      const token = getAppSessionToken();
      if (!token) throw new Error("Unauthorized");

      const imageBase64 = pendingImage ? await readFileAsDataUrl(pendingImage.file) : null;
      const result = await sendProjectChatMessage({
        data: {
          projectId,
          body: body || undefined,
          fileName: pendingImage?.file.name,
          mimeType: pendingImage?.file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif" | undefined,
          dataBase64: imageBase64 ? imageBase64.split(",")[1] ?? "" : undefined,
        },
        headers: { "x-app-session": token },
      });

      const inserted = result.message as Msg;
      setMessages((prev) => prev.map((item) => (item.id === optimisticId ? inserted : item)));
      if (optimisticPreviewUrl) {
        URL.revokeObjectURL(optimisticPreviewUrl);
        optimisticPreviewUrl = null;
      }
    } catch (error: any) {
      setMessages((prev) => prev.filter((item) => item.id !== optimisticId));
      setText(body);
      if (pendingImage) {
        setSelectedImage({ file: pendingImage.file, previewUrl: URL.createObjectURL(pendingImage.file) });
      }
      toast.error("ส่งข้อความไม่สำเร็จ", { description: error?.message ?? "ไม่สามารถส่งข้อความได้" });
    } finally {
      if (optimisticPreviewUrl) URL.revokeObjectURL(optimisticPreviewUrl);
      setSending(false);
    }
  };

  if (loading) return <CloudJectLoading />;

  if (!projects.length) {
    return (
      <div className="card-surface p-10 text-center text-sm text-muted-foreground">
        <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <div className="mt-3">ยังไม่มีโครงการที่จะแชท</div>
      </div>
    );
  }

  return (
    <div className="grid h-[calc(100vh-220px)] grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
      <aside className="card-surface overflow-y-auto p-3">
        <div className="px-2 py-1.5 text-xs uppercase tracking-wide text-muted-foreground">โครงการ</div>
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => setProjectId(p.id)}
            className={
              "mb-0.5 w-full rounded-md px-2.5 py-2 text-left text-sm " +
              (projectId === p.id ? "bg-primary text-primary-foreground" : "hover:bg-accent")
            }
          >
            <div className="truncate font-medium">{p.name}</div>
            <div className={"truncate text-[11px] " + (projectId === p.id ? "text-primary-foreground/80" : "text-muted-foreground")}>{p.code}</div>
          </button>
        ))}
      </aside>

      <section className="card-surface flex min-h-[400px] flex-col">
        <div className="border-b border-border px-4 py-3 text-sm font-medium">
          {projects.find((p) => p.id === projectId)?.name}
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">ยังไม่มีข้อความ</div>
          ) : (
            messages.map((m) => {
              const me = m.sender_id === user?.id;
              const imageUrl = m.local_preview_url ?? chatImageUrl(m.image_path);
              const imageOnly = Boolean(imageUrl) && !m.body;
              return (
                <div key={m.id} className={"flex " + (me ? "justify-end" : "justify-start")}>
                  <div
                    className={
                      "max-w-[75%] text-sm " +
                      (imageOnly
                        ? ""
                        : "rounded-2xl px-3.5 py-2 " + (me ? "bg-primary text-primary-foreground" : "bg-secondary"))
                    }
                  >
                    {!me ? <div className="mb-0.5 text-[10px] opacity-70">{m.sender_name}</div> : null}
                    <div className="space-y-2 whitespace-pre-wrap break-words">
                      {imageUrl ? <img src={imageUrl} alt={m.body ?? "chat image"} className="max-h-80 max-w-full rounded-xl object-cover" /> : null}
                      {m.body ? <div>{m.body}</div> : null}
                    </div>
                    <div className={"mt-1 text-[10px] " + (imageOnly || !me ? "text-muted-foreground" : "text-primary-foreground/70")}>
                      {formatTime(m.created_at)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={send} className="space-y-3 border-t border-border p-3">
          {selectedImage ? (
            <div className="flex items-start gap-3 rounded-xl border border-border bg-background p-3">
              <img src={selectedImage.previewUrl} alt={selectedImage.file.name} className="h-20 w-20 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{selectedImage.file.name}</div>
                <div className="text-xs text-muted-foreground">
                  {(selectedImage.file.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
              <button
                type="button"
                onClick={clearSelectedImage}
                disabled={sending}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => onPickImage(event.target.files?.[0] ?? null)}
              disabled={sending}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted disabled:opacity-50"
              aria-label="แนบรูปภาพ"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="พิมพ์ข้อความ..."
              disabled={sending}
              className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={(!text.trim() && !selectedImage) || sending}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} ส่ง
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
