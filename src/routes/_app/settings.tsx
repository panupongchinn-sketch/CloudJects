import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Camera, Loader2, Pencil, Shield, Trash2, Upload, User as UserIcon, Building2, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { changeAppPassword } from "@/lib/app-auth.functions";
import { getStoredAppSession, setStoredAppSession } from "@/lib/app-auth-client";
import { redirectToLogin, signOut, useAuth } from "@/hooks/use-auth";
import { CloudJectLoading } from "@/components/loading/cloudject-loading";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  organization_id: string | null;
  source: "profiles" | "app_users";
};

type OrgRow = {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
};

function SettingsPage() {
  return (
    <>
      <Header title="Settings" subtitle="Profile, organization, and security" />
      <main className="flex-1 p-4 lg:p-6">
        <div className="mx-auto max-w-5xl">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile" className="gap-2">
                <UserIcon className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="organization" className="gap-2">
                <Building2 className="h-4 w-4" />
                Organization
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Shield className="h-4 w-4" />
                Security
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="profile">
                <ProfileSection />
              </TabsContent>
              <TabsContent value="organization">
                <OrganizationSection />
              </TabsContent>
              <TabsContent value="security">
                <SecuritySection />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </main>
    </>
  );
}

function ProfileSection() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [initialProfile, setInitialProfile] = useState<ProfileRow | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [about, setAbout] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, avatar_url, organization_id")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError) {
        toast.error(profileError.message);
      }

      if (profileData) {
        const nextProfile = { ...(profileData as Omit<ProfileRow, "source">), source: "profiles" as const };
        setProfile(nextProfile);
        setInitialProfile(nextProfile);
        setLoading(false);
        return;
      }

      const [{ data: appUserById, error: appUserByIdError }, { data: appUserByProfileId, error: appUserByProfileIdError }, { data: appUserByEmail, error: appUserByEmailError }] =
        await Promise.all([
          supabase.from("app_users").select("id, user_id, full_name, email, avatar_url, organization_id").eq("id", user.id).maybeSingle(),
          supabase.from("app_users").select("id, user_id, full_name, email, avatar_url, organization_id").eq("user_id", user.id).maybeSingle(),
          user.email
            ? supabase.from("app_users").select("id, user_id, full_name, email, avatar_url, organization_id").eq("email", user.email).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ]);

      const appUserError = appUserByIdError ?? appUserByProfileIdError ?? appUserByEmailError;
      if (appUserError) toast.error(appUserError.message);

      const appUser = appUserById ?? appUserByProfileId ?? appUserByEmail;
      const nextProfile = appUser
        ? {
            id: appUser.id,
            full_name: appUser.full_name,
            email: appUser.email,
            avatar_url: (appUser as { avatar_url?: string | null }).avatar_url ?? null,
            organization_id: appUser.organization_id,
            source: "app_users" as const,
          }
        : null;
      setProfile(nextProfile);
      setInitialProfile(nextProfile);
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    const update =
      profile.source === "app_users"
        ? supabase
            .from("app_users")
            .update({
              full_name: profile.full_name,
              avatar_url: profile.avatar_url ?? null,
            })
            .eq("id", profile.id)
        : supabase
            .from("profiles")
            .update({
              full_name: profile.full_name,
              phone: profile.phone ?? null,
              avatar_url: profile.avatar_url ?? null,
            })
            .eq("id", profile.id);
    const { error } = await update;
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setInitialProfile(profile);
    const session = getStoredAppSession();
    if (session?.user) {
      setStoredAppSession({
        ...session,
        user: {
          ...session.user,
          user_metadata: {
            ...session.user.user_metadata,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url ?? null,
          },
        },
      });
    }
    toast.success("Profile updated");
  };

  const resetProfile = () => {
    if (initialProfile) setProfile(initialProfile);
    setJobTitle("");
    setAbout("");
  };

  const chooseAvatar = () => {
    fileInputRef.current?.click();
  };

  const changeAvatar = async (file?: File) => {
    if (!profile || !file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be 2MB or smaller");
      return;
    }

    const avatarUrl = await readFileAsDataUrl(file);
    setProfile({ ...profile, avatar_url: avatarUrl });
  };

  const removeAvatar = () => {
    if (!profile) return;
    setProfile({ ...profile, avatar_url: null });
  };

  if (loading) return <LoadingCard />;
  if (!profile) return <EmptyCard message="Profile not found" />;

  const avatarInitials = getProfileInitials(profile.full_name, profile.email);

  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-200 px-8 py-6">
        <CardTitle className="text-xl">Profile</CardTitle>
        <CardDescription>Manage your personal information and how you appear in CloudJect.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-7 px-8 py-7">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            void changeAvatar(file);
            event.currentTarget.value = "";
          }}
        />
        <div className="grid gap-8 lg:grid-cols-[180px_minmax(0,1fr)]">
          <div className="flex justify-center lg:justify-start">
            <div className="relative h-36 w-36">
              <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-5xl font-medium text-white shadow-lg shadow-blue-500/25">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  avatarInitials
                )}
              </div>
              <button
                type="button"
                onClick={chooseAvatar}
                className="absolute bottom-2 right-0 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                title="Change photo"
              >
                <Camera className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-slate-950">Profile photo</h3>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                This photo will be displayed with your name on your profile and across CloudJect.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={chooseAvatar}
                className="inline-flex h-16 min-w-[220px] items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white px-5 text-sm font-semibold text-blue-600 transition hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
              >
                <Upload className="h-5 w-5" />
                <span>
                  Upload photo
                  <span className="block text-xs font-normal text-muted-foreground">JPG, PNG up to 2MB</span>
                </span>
              </button>
              <Button type="button" variant="outline" onClick={chooseAvatar} className="h-11 gap-2 border-blue-200 text-blue-600 hover:bg-blue-50">
                <Pencil className="h-4 w-4" />
                Change
              </Button>
              <Button type="button" variant="outline" onClick={removeAvatar} className="h-11 gap-2 border-red-200 text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-5 border-t border-slate-200 pt-6 sm:grid-cols-2">
          <Field label="Full name">
            <Input value={profile.full_name ?? ""} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input value={profile.email ?? ""} disabled />
          </Field>
          <Field label="Phone">
            <Input
              value={profile.phone ?? ""}
              placeholder="Enter your phone number"
              disabled={profile.source === "app_users"}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            />
          </Field>
          <Field label="Job title / Position">
            <Input
              value={jobTitle}
              placeholder="Enter your job title or position"
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </Field>
          <div className="space-y-2 sm:col-span-2">
            <Label>About you</Label>
            <Textarea
              value={about}
              placeholder="Tell others a little bit about yourself..."
              onChange={(e) => setAbout(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
          <Button type="button" variant="outline" onClick={resetProfile} disabled={saving} className="min-w-32">
            Cancel
          </Button>
          <Button onClick={save} disabled={saving} className="min-w-36 gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function OrganizationSection() {
  const { user } = useAuth();
  const [org, setOrg] = useState<OrgRow | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      const [{ data: profile }, { data: appUserById }, { data: appUserByProfileId }, { data: appUserByEmail }] = await Promise.all([
        supabase.from("profiles").select("organization_id").eq("id", user.id).maybeSingle(),
        supabase.from("app_users").select("organization_id, role").eq("id", user.id).maybeSingle(),
        supabase.from("app_users").select("organization_id, role").eq("user_id", user.id).maybeSingle(),
        user.email
          ? supabase.from("app_users").select("organization_id, role").eq("email", user.email).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      const appUser = appUserById ?? appUserByProfileId ?? appUserByEmail;
      const organizationId = profile?.organization_id ?? appUser?.organization_id ?? null;
      if (!organizationId) {
        setLoading(false);
        return;
      }

      const [{ data: orgData }, { data: roles }] = await Promise.all([
        supabase
          .from("organizations")
          .select("id, name, contact_name, email, phone, address")
          .eq("id", organizationId)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      const roleNames = [...(roles ?? []).map((row) => row.role as string), ...(appUser?.role ? [appUser.role] : [])];
      setCanEdit(roleNames.includes("super_admin") || roleNames.includes("company_admin"));
      setOrg((orgData as OrgRow) ?? null);
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!org || !canEdit) return;
    setSaving(true);
    const { error } = await supabase
      .from("organizations")
      .update({
        name: org.name,
        contact_name: org.contact_name,
        email: org.email,
        phone: org.phone,
        address: org.address,
      })
      .eq("id", org.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Organization updated");
  };

  if (loading) return <LoadingCard />;
  if (!org) return <EmptyCard message="Organization not found" />;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Organization</CardTitle>
            <CardDescription>Edit company information</CardDescription>
          </div>
          {!canEdit && <Badge variant="outline">Read only</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Organization name">
            <Input value={org.name} disabled={!canEdit} onChange={(e) => setOrg({ ...org, name: e.target.value })} />
          </Field>
          <Field label="Contact name">
            <Input value={org.contact_name ?? ""} disabled={!canEdit} onChange={(e) => setOrg({ ...org, contact_name: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input value={org.email ?? ""} disabled={!canEdit} onChange={(e) => setOrg({ ...org, email: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input value={org.phone ?? ""} disabled={!canEdit} onChange={(e) => setOrg({ ...org, phone: e.target.value })} />
          </Field>
          <div className="space-y-2 sm:col-span-2">
            <Label>Address</Label>
            <Textarea value={org.address ?? ""} disabled={!canEdit} onChange={(e) => setOrg({ ...org, address: e.target.value })} rows={3} />
          </div>
        </div>
        {canEdit && (
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SecuritySection() {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const updatePassword = async () => {
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    const session = getStoredAppSession();
    if (!session?.token) {
      toast.error("Please sign in again");
      return;
    }
    setSaving(true);
    try {
      await changeAppPassword({ data: { token: session.token, password } });
      setPassword("");
      setConfirmPassword("");
      toast.success("Password updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Change password
          </CardTitle>
          <CardDescription>{user?.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="New password">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Field label="Confirm password">
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button onClick={updatePassword} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>Sign out from this device</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={async () => {
              await signOut();
              redirectToLogin();
            }}
          >
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function getProfileInitials(name?: string | null, email?: string | null) {
  const source = (name || email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Unable to read image file"));
    reader.readAsDataURL(file);
  });
}

function LoadingCard() {
  return <CloudJectLoading />;
}

function EmptyCard({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center text-slate-500">{message}</CardContent>
    </Card>
  );
}
