import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Loader2, MessageSquare, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fetchProfileMap, type ProfileRow } from "@/lib/app-data";

export const Route = createFileRoute("/_app/projects/$projectId/chat")({
  component: ChatPage,
});

type ChatMessage = {
  id: string;
  project_id: string;
  sender_id: string | null;
  body: string | null;
  image_path: string | null;
  created_at: string;
  local_preview_url?: string | null;
};

type ProfileLite = Pick<ProfileRow, "id" | "full_name" | "email" | "avatar_url">;

type PendingImage = {
  file: File;
  previewUrl: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CHAT_IMAGE_BUCKET = "project-photos";
const MAX_CHAT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

function toProjectUuid(s: string): string {
  if (UUID_RE.test(s)) return s.toLowerCase();
  let h1 = 0x811c9dc5;
  let h2 = 0xcbf29ce4;
  let h3 = 0x84222325;
  let h4 = 0xfb8c4d3b;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 ^ c, 2246822519) >>> 0;
    h3 = Math.imul(h3 ^ c, 3266489917) >>> 0;
    h4 = Math.imul(h4 ^ c, 374761393) >>> 0;
  }
  const hex = [h1, h2, h3, h4].map((n) => n.toString(16).padStart(8, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

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

function initialsOf(p?: ProfileLite | null) {
  const name = p?.full_name || p?.email || "?";
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ChatPage() {
  const { projectId } = useParams({ from: "/_app/projects/$projectId/chat" });
  const { user, loading: authLoading } = useAuth();
  const roomId = useMemo(() => toProjectUuid(projectId), [projectId]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<PendingImage | null>(null);
  const [currentSender, setCurrentSender] = useState<ProfileLite | null>(null);
  const [currentSenderIds, setCurrentSenderIds] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!user) {
        setCurrentSender(null);
        setCurrentSenderIds([]);
        return;
      }

      const ids = new Set<string>([user.id]);
      const fallbackSender: ProfileLite = {
        id: user.id,
        full_name: user.user_metadata?.full_name ?? null,
        email: user.email,
        avatar_url: null,
      };

      const [{ data: appUserById }, { data: appUserByProfileId }, { data: appUserByEmail }] = await Promise.all([
        supabase.from("app_users").select("id,user_id,full_name,email").eq("id", user.id).maybeSingle(),
        supabase.from("app_users").select("id,user_id,full_name,email").eq("user_id", user.id).maybeSingle(),
        user.email
          ? supabase.from("app_users").select("id,user_id,full_name,email").eq("email", user.email).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const appUser = appUserById ?? appUserByProfileId ?? appUserByEmail;
      if (appUser?.id) ids.add(appUser.id);
      if (appUser?.user_id) ids.add(appUser.user_id);

      const sender: ProfileLite = {
        id: appUser?.user_id ?? fallbackSender.id,
        full_name: appUser?.full_name ?? fallbackSender.full_name,
        email: appUser?.email ?? fallbackSender.email,
        avatar_url: null,
      };

      if (cancelled) return;
      setCurrentSender(sender);
      setCurrentSenderIds(Array.from(ids));
      setProfiles((prev) => {
        const next = { ...prev };
        for (const id of ids) next[id] = { ...sender, id };
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, project_id, sender_id, body, image_path, created_at")
        .eq("project_id", roomId)
        .order("created_at", { ascending: true })
        .limit(500);

      if (cancelled) return;

      if (error) {
        toast.error("โหลดข้อความไม่สำเร็จ", { description: error.message });
        setMessages([]);
      } else {
        setMessages((data as ChatMessage[]) ?? []);
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  useEffect(() => {
    const ids = Array.from(new Set(messages.map((m) => m.sender_id).filter(Boolean) as string[]));
    const missing = ids.filter((id) => !profiles[id]);
    if (missing.length === 0) return;

    (async () => {
      const resolvedProfiles = await fetchProfileMap(missing);
      if (resolvedProfiles.size === 0) return;

      setProfiles((prev) => {
        const next = { ...prev };
        for (const [id, profile] of resolvedProfiles.entries()) {
          next[id] = {
            id,
            full_name: profile.full_name,
            email: profile.email,
            avatar_url: profile.avatar_url ?? null,
          };
        }
        return next;
      });
    })();
  }, [messages, profiles]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat:${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `project_id=eq.${roomId}` },
        (payload) => {
          const message = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((item) => item.id === message.id) ? prev : [...prev, message]));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, loading]);

  useEffect(() => {
    return () => {
      if (selectedImage?.previewUrl) {
        URL.revokeObjectURL(selectedImage.previewUrl);
      }
    };
  }, [selectedImage]);

  const clearSelectedImage = () => {
    if (selectedImage?.previewUrl) {
      URL.revokeObjectURL(selectedImage.previewUrl);
    }
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

    if (selectedImage?.previewUrl) {
      URL.revokeObjectURL(selectedImage.previewUrl);
    }

    setSelectedImage({ file, previewUrl: URL.createObjectURL(file) });
  };

  const send = async () => {
    const body = input.trim();
    const pendingImage = selectedImage;

    if ((!body && !pendingImage) || !user) return;

    setSending(true);

    let optimisticPreviewUrl: string | null = pendingImage?.previewUrl ?? null;
    const optimisticId = `tmp-${Date.now()}`;
    let uploadedPath: string | null = null;
    const senderId = currentSender?.id ?? user.id;

    try {
      if (pendingImage) {
        uploadedPath = await readFileAsDataUrl(pendingImage.file);
      }

      const optimistic: ChatMessage = {
        id: optimisticId,
        project_id: roomId,
        sender_id: senderId,
        body: body || null,
        image_path: uploadedPath,
        created_at: new Date().toISOString(),
        local_preview_url: optimisticPreviewUrl,
      };

      setMessages((prev) => [...prev, optimistic]);
      setInput("");
      setSelectedImage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      let { data: inserted, error } = await supabase
        .from("chat_messages")
        .insert({
          project_id: roomId,
          sender_id: senderId,
          body: body || null,
          image_path: uploadedPath,
        })
        .select("id, project_id, sender_id, body, image_path, created_at")
        .single();

      if (error) throw error;

      setMessages((prev) =>
        prev.map((item) => (item.id === optimisticId ? ({ ...(inserted as ChatMessage), sender_id: senderId } as ChatMessage) : item)),
      );

      if (optimisticPreviewUrl) {
        URL.revokeObjectURL(optimisticPreviewUrl);
        optimisticPreviewUrl = null;
      }
    } catch (error: any) {
      setMessages((prev) => prev.filter((item) => item.id !== optimisticId));
      setInput(body);

      if (pendingImage) {
        setSelectedImage({
          file: pendingImage.file,
          previewUrl: URL.createObjectURL(pendingImage.file),
        });
      }

      toast.error("ส่งรูปไม่สำเร็จ", {
        description: error?.message ?? "ไม่สามารถอัปโหลดรูปได้",
      });
    } finally {
      if (optimisticPreviewUrl) {
        URL.revokeObjectURL(optimisticPreviewUrl);
      }
      setSending(false);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <section className="card-surface flex h-[70vh] flex-col overflow-hidden p-0">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <div>
          <h2 className="font-semibold">Project Chat</h2>
          <p className="text-xs text-muted-foreground">
            {loading ? "กำลังโหลด..." : `${messages.length} ข้อความ · realtime`}
          </p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-background/40 p-5">
        {loading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <MessageSquare className="h-10 w-10 opacity-40" />
            <div className="text-sm">ยังไม่มีข้อความ พิมพ์ทักทายเป็นคนแรก</div>
          </div>
        ) : (
          messages.map((message) => {
            const profile = message.sender_id ? profiles[message.sender_id] : null;
            const isMe = Boolean(message.sender_id && currentSenderIds.includes(message.sender_id));
            const imageUrl = message.local_preview_url ?? chatImageUrl(message.image_path);
            const hasImageOnly = Boolean(imageUrl) && !message.body;
            const senderName = profile?.full_name || profile?.email || (message.sender_id ? "Unknown" : "-");

            return (
              <div key={message.id} className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : ""}`}>
                <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-[11px] font-semibold">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initialsOf(profile)
                  )}
                </div>
                <div className={`flex max-w-[75%] flex-col ${isMe ? "items-end" : "items-start"}`}>
                  <div className="flex items-baseline gap-2 text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">{senderName}</span>
                    <span suppressHydrationWarning>{formatTime(message.created_at)}</span>
                  </div>
                  <div
                    className={
                      "mt-1 text-sm whitespace-pre-wrap break-words " +
                      (hasImageOnly
                        ? ""
                        : isMe
                          ? "rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-primary-foreground"
                          : "rounded-2xl rounded-bl-md border border-border bg-card px-3.5 py-2")
                    }
                  >
                    <div className="space-y-2">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={message.body ?? "chat image"}
                          className="max-h-80 max-w-full rounded-xl object-cover"
                        />
                      ) : null}
                      {message.body ? <div>{message.body}</div> : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <footer className="space-y-3 border-t border-border p-3">
        {selectedImage ? (
          <div className="flex items-start gap-3 rounded-xl border border-border bg-background p-3">
            <img
              src={selectedImage.previewUrl}
              alt={selectedImage.file.name}
              className="h-20 w-20 rounded-lg object-cover"
            />
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

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
            disabled={authLoading || !user || sending}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={authLoading || !user || sending}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted disabled:opacity-50"
            aria-label="แนบรูปภาพ"
          >
            <ImagePlus className="h-4 w-4" />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            disabled={authLoading || !user || sending}
            placeholder={user ? "พิมพ์ข้อความ แล้วกด Enter..." : "กรุณาเข้าสู่ระบบเพื่อแชท"}
            className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
          />
          <button
            onClick={() => void send()}
            disabled={(!input.trim() && !selectedImage) || sending || !user}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            ส่ง
          </button>
        </div>
      </footer>
    </section>
  );
}
