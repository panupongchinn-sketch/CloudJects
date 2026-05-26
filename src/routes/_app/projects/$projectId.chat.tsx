import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2, MessageSquare, Send, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getAppSessionToken } from "@/lib/app-auth-client";
import { fetchProfileMap, type ProfileRow } from "@/lib/app-data";
import { listProjectChatMessages, sendProjectChatMessage } from "@/lib/chat.functions";
import { useAuth } from "@/hooks/use-auth";

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

const CHAT_IMAGE_BUCKET = "chat-images";
const MAX_CHAT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
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

function initialsOf(profile?: ProfileLite | null) {
  const source = profile?.full_name || profile?.email || "?";
  return source
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ChatPage() {
  const { projectId } = useParams({ from: "/_app/projects/$projectId/chat" });
  const { user, loading: authLoading } = useAuth();
  const roomId = useMemo(() => projectId, [projectId]);

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
      const token = getAppSessionToken();
      if (!token) {
        if (!cancelled) {
          setMessages([]);
          setLoading(false);
        }
        return;
      }

      try {
        const result = await listProjectChatMessages({
          data: { projectId: roomId, limit: 500 },
          headers: { "x-app-session": token },
        });

        if (cancelled) return;
        setMessages((result.messages as ChatMessage[]) ?? []);
      } catch (error: any) {
        if (cancelled) return;
        toast.error("โหลดข้อความไม่สำเร็จ", { description: error?.message ?? "Unknown error" });
        setMessages([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  useEffect(() => {
    if (!loading) return;
    const timeout = window.setTimeout(() => setLoading(false), 8000);
    return () => window.clearTimeout(timeout);
  }, [loading, roomId]);

  useEffect(() => {
    const ids = Array.from(new Set(messages.map((message) => message.sender_id).filter(Boolean) as string[]));
    const missingIds = ids.filter((id) => !profiles[id]);
    if (missingIds.length === 0) return;

    (async () => {
      const resolvedProfiles = await fetchProfileMap(missingIds);
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
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [messages.length, loading]);

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

  const send = async () => {
    const body = input.trim();
    const pendingImage = selectedImage;

    if ((!body && !pendingImage) || !user) return;

    setSending(true);

    let optimisticPreviewUrl: string | null = pendingImage?.previewUrl ?? null;
    const optimisticId = `tmp-${Date.now()}`;
    const senderId = currentSender?.id ?? user.id;

    try {
      const optimistic: ChatMessage = {
        id: optimisticId,
        project_id: roomId,
        sender_id: senderId,
        body: body || null,
        image_path: null,
        created_at: new Date().toISOString(),
        local_preview_url: optimisticPreviewUrl,
      };

      setMessages((prev) => [...prev, optimistic]);
      setInput("");
      setSelectedImage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      const token = getAppSessionToken();
      if (!token) throw new Error("Unauthorized");

      const imageBase64 = pendingImage ? await readFileAsDataUrl(pendingImage.file) : null;
      const result = await sendProjectChatMessage({
        data: {
          projectId: roomId,
          body: body || undefined,
          fileName: pendingImage?.file.name,
          mimeType: pendingImage?.file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif" | undefined,
          dataBase64: imageBase64 ? imageBase64.split(",")[1] ?? "" : undefined,
        },
        headers: { "x-app-session": token },
      });

      const inserted = result.message as ChatMessage;
      setMessages((prev) => prev.map((item) => (item.id === optimisticId ? inserted : item)));

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

      toast.error("ส่งข้อความไม่สำเร็จ", {
        description: error?.message ?? "ไม่สามารถส่งข้อความได้",
      });
    } finally {
      if (optimisticPreviewUrl) URL.revokeObjectURL(optimisticPreviewUrl);
      setSending(false);
    }
  };

  const onKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
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

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => onPickImage(event.target.files?.[0] ?? null)}
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
            onChange={(event) => setInput(event.target.value)}
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
