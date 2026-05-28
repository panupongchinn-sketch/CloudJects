import { useState, type FormEvent, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Building2,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import heroImage from "@/assets/login-hero.jpg";
import { BrandLogo } from "@/components/layout/brand-logo";
import { signUpWithTrial } from "@/lib/app-auth.functions";
import { setStoredAppSession } from "@/lib/app-auth-client";

export const Route = createFileRoute("/signup")({
  validateSearch: (search): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: SignupPage,
  head: () => ({
    meta: [
      { title: "สมัครใช้งาน - CloudJect" },
      {
        name: "description",
        content: "สมัครใช้งาน CloudJect และเริ่มทดลองใช้ได้ทันที 15 วัน",
      },
    ],
  }),
});

function SignupPage() {
  const navigate = useNavigate();
  const signUp = useServerFn(signUpWithTrial);
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();

      const session = await signUp({
        data: {
          fullName: fullName.trim(),
          company: company.trim(),
          phone: phone.trim(),
          address: address.trim(),
          email: normalizedEmail,
          password,
        },
      });

      setStoredAppSession(session);
      toast.success("สมัครสำเร็จ เริ่มทดลองใช้ 15 วันได้ทันที");
      navigate({ to: "/dashboard" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:block relative overflow-hidden bg-sidebar">
        <img
          src={heroImage}
          alt="ทีมงานก่อสร้างใช้งานระบบ CloudJect"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>

      <div className="flex items-center justify-center overflow-y-auto bg-gradient-to-br from-white via-sky-50 to-blue-100 p-4 lg:p-8">
        <div className="w-full max-w-[560px] rounded-2xl border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/70 md:p-8">
          <div className="mb-6 flex justify-center lg:hidden">
            <BrandLogo variant="signup" className="h-auto w-full max-w-[240px] object-contain" />
          </div>

          <div className="mb-7">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <BrandLogo variant="signup" className="h-auto w-full max-w-[260px] object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">สมัครใช้งาน</h1>
                <p className="mt-1 text-sm text-slate-500 font-medium">
                  สร้างบัญชีใหม่และเริ่มทดลองใช้ได้ทันที 15 วัน
                </p>
              </div>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                label="ชื่อ-นามสกุล"
                icon={<UserIcon className="w-5 h-5" />}
                value={fullName}
                onChange={setFullName}
                placeholder="ชื่อ-นามสกุล / Full Name"
              />

              <InputField
                label="บริษัท"
                icon={<Building2 className="w-5 h-5" />}
                value={company}
                onChange={setCompany}
                placeholder="ชื่อบริษัท"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                label="เบอร์โทร"
                icon={<Phone className="w-5 h-5" />}
                value={phone}
                onChange={setPhone}
                placeholder="เช่น 0812345678"
              />

              <InputField
                label="อีเมล"
                type="email"
                icon={<Mail className="w-5 h-5" />}
                value={email}
                onChange={setEmail}
                placeholder="you@company.co.th"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1 block">ที่อยู่</label>
              <div className="relative group">
                <div className="absolute left-0 top-4 pl-4 flex pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                  <MapPin className="w-5 h-5" />
                </div>
                <textarea
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="ที่อยู่บริษัท"
                  className="w-full min-h-20 pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-sky-100 focus:border-primary transition-all text-slate-900 placeholder:text-slate-400 font-medium text-sm resize-none"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                label="รหัสผ่าน"
                type="password"
                icon={<Lock className="w-5 h-5" />}
                value={password}
                onChange={setPassword}
                placeholder="อย่างน้อย 6 ตัวอักษร"
              />

              <InputField
                label="ยืนยันรหัสผ่าน"
                type="password"
                icon={<Lock className="w-5 h-5" />}
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="ยืนยันรหัสผ่าน"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover text-primary-foreground font-bold py-3 rounded-xl shadow-lg shadow-blue-200 transition-all duration-200 flex items-center justify-center gap-2 group active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <span>สมัครใช้งาน</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="mt-7 text-center text-slate-500 text-sm font-medium">
            มีบัญชีอยู่แล้ว?{" "}
            <Link to="/login" className="text-primary font-bold hover:underline underline-offset-4 ml-1">
              เข้าสู่ระบบ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function InputField({
  label,
  icon,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  icon: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "text" | "email" | "password";
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-slate-700 ml-1 block">{label}</label>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
          {icon}
        </div>
        <input
          type={type}
          required
          minLength={type === "password" ? 6 : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-sky-100 focus:border-primary transition-all text-slate-900 placeholder:text-slate-400 font-medium text-sm"
        />
      </div>
    </div>
  );
}
