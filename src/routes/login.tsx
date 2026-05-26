import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import heroImage from "@/assets/login-hero.jpg";
import { BrandLogo } from "@/components/layout/brand-logo";
import { listActiveAdvertisements, type AdvertisementRecord } from "@/lib/advertisements.functions";
import { signInWithAppAuth } from "@/lib/app-auth.functions";
import { setStoredAppSession } from "@/lib/app-auth-client";

export const Route = createFileRoute("/login")({
  validateSearch: (search): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "เข้าสู่ระบบ - CloudJect" },
      { name: "description", content: "เข้าสู่ระบบ CloudJect ด้วยบัญชีของแอป" },
    ],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const signIn = useServerFn(signInWithAppAuth);
  const loadAdvertisements = useServerFn(listActiveAdvertisements);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [advertisements, setAdvertisements] = useState<AdvertisementRecord[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let mounted = true;
    void loadAdvertisements()
      .then((result) => {
        if (mounted) setAdvertisements(result.advertisements);
      })
      .catch(() => {
        if (mounted) setAdvertisements([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (advertisements.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % advertisements.length);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [advertisements]);

  const goNext = () => {
    const target = search.redirect && search.redirect.startsWith("/") ? search.redirect : "/dashboard";
    navigate({ to: target });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const session = await signIn({
        data: {
          email: email.trim().toLowerCase(),
          password,
        },
      });
      setStoredAppSession(session);
      toast.success("เข้าสู่ระบบสำเร็จ");
      goNext();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const slides = advertisements.length
    ? advertisements
    : [{ id: "fallback", title: "CloudJect", imageUrl: heroImage }];

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="relative hidden overflow-hidden bg-slate-950 lg:block">
        {slides.map((item, index) => (
          <img
            key={item.id}
            src={item.imageUrl}
            alt={item.title ?? "CloudJect advertisement"}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
              index === activeIndex ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/25 via-transparent to-slate-950/15" />
        {slides.length > 1 ? (
          <div className="absolute bottom-6 left-6 flex items-center gap-2">
            {slides.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`h-2.5 rounded-full transition-all ${
                  index === activeIndex ? "w-8 bg-white" : "w-2.5 bg-white/45 hover:bg-white/70"
                }`}
                aria-label={`Show advertisement ${index + 1}`}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-center bg-gradient-to-br from-white via-sky-50 to-blue-100 p-6 lg:p-12">
        <div className="w-full max-w-[480px] rounded-2xl border border-blue-100 bg-white p-8 shadow-xl shadow-blue-100/70 md:p-12">
          <div className="mb-8 flex items-center justify-center gap-2.5 lg:hidden">
            <BrandLogo className="h-11 w-11 shrink-0 object-contain" />
            <div className="text-base font-semibold">CloudJect</div>
          </div>

          <div className="mb-10 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">เข้าสู่ระบบ</h1>
            <p className="mt-3 text-sm font-medium text-slate-500">
              ใช้บัญชีของแอปโดยไม่พึ่ง Supabase Auth
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="ml-1 block text-sm font-semibold text-slate-700">อีเมล</label>
              <div className="group relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 transition-colors group-focus-within:text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.co.th"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pr-4 pl-11 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-sky-100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <label className="text-sm font-semibold text-slate-700">รหัสผ่าน</label>
              </div>
              <div className="group relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 transition-colors group-focus-within:text-primary">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pr-4 pl-11 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-sky-100"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-bold text-primary-foreground shadow-lg shadow-blue-200 transition-all duration-200 hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <span>เข้าสู่ระบบ</span>
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <p className="mt-10 text-center text-sm font-medium text-slate-500">
            ยังไม่มีบัญชี?{" "}
            <Link to="/signup" className="ml-1 font-bold text-primary underline-offset-4 hover:underline">
              สมัครใช้งาน
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
