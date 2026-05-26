import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Send, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProjects, type MyProject } from "@/lib/portal-data";
import { fetchProfileMap } from "@/lib/app-data";
import { toast } from "sonner";
import { CloudJectLoading } from "@/components/loading/cloudject-loading";

export const Route = createFileRoute("/_app/portal/chat")({
  component: ChatPage,
});

type Msg = {
  id: string;
  body: string;
  sender_id: string | null;
  created_at: string;
  sender_name?: string;
};

function ChatPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<MyProject[]>([]);
  const [projectId, setProjectId] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

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
    const { data } = await supabase
      .from("chat_messages")
      .select("id, body, sender_id, created_at")
      .eq("project_id", pid)
      .order("created_at", { ascending: true })
      .limit(100);

    const rows: any[] = data ?? [];
    const ids = Array.from(new Set(rows.map((m) => m.sender_id).filter(Boolean)));
    const nameMap = new Map<string, string>();
    if (ids.length) {
      const profiles = await fetchProfileMap(ids);
      for (const [id, profile] of profiles.entries()) {
        nameMap.set(id, profile.full_name ?? profile.email ?? "");
      }
    }
    setMessages(rows.map((m: any) => ({ ...m, sender_name: nameMap.get(m.sender_id) ?? "-" })));
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

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !projectId || !user) return;
    const body = text.trim();
    setText("");
    const { error } = await supabase.from("chat_messages").insert({
      project_id: projectId,
      sender_id: user.id,
      body,
    });
    if (error) toast.error(error.message);
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
          ) : messages.map((m) => {
            const me = m.sender_id === user?.id;
            return (
              <div key={m.id} className={"flex " + (me ? "justify-end" : "justify-start")}>
                <div className={"max-w-[75%] rounded-2xl px-3.5 py-2 text-sm " + (me ? "bg-primary text-primary-foreground" : "bg-secondary")}>
                  {!me && <div className="mb-0.5 text-[10px] opacity-70">{m.sender_name}</div>}
                  <div className="whitespace-pre-wrap break-words">{m.body}</div>
                  <div className={"mt-1 text-[10px] " + (me ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {new Date(m.created_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="พิมพ์ข้อความ..."
            className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm"
          />
          <button type="submit" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
            <Send className="h-4 w-4" /> ส่ง
          </button>
        </form>
      </section>
    </div>
  );
}
