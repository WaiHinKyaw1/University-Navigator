import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User as UserIcon, Mail, Lock, Loader2, CheckCircle2, Pencil } from "lucide-react";

import { toast } from "sonner";

import ChangePassword from "@/pages/change-password";
import SavedUniversities from "@/components/saved-universities";
import ProfileImageUpload from "@/components/profile-image-upload";

export default function Profile() {
  const { user } = useAuth();

  const [name, setName] = useState(user?.name || "");

  const [email, setEmail] = useState(user?.email || "");

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const [saved, setSaved] = useState(false);

  const [editingInfo, setEditingInfo] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);
      setSaved(false);

      const token = localStorage.getItem("token");

      const res = await fetch("/api/auth/profile", {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",

          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          name,

          email,
        }),
      });

      if (!res.ok) throw new Error();

      toast.success("Profile updated");
      setSaved(true);
      setEditingInfo(false);
    } catch {
      toast.error("Update failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setAvatarUrl(user.avatarUrl || null);
    }
  }, [user]);

  const initials = (name || user?.email || "U")
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          {/* Left: identity card */}
          <div className="rounded-2xl border border-border/70 bg-card shadow-sm">
            <div className="relative flex flex-col items-center border-b border-border/70 bg-primary/5 px-5 py-7">
              <div className="relative">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile avatar"
                    className="h-24 w-24 rounded-full border-4 border-background object-cover shadow-md"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-background bg-primary/15 text-2xl font-bold text-primary shadow-md">
                    {initials}
                  </div>
                )}
              </div>
              <h1 className="mt-4 text-lg font-bold text-foreground">{name || "My Profile"}</h1>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> {email}
              </p>
              <span
                className={`mt-2 rounded-full px-3 py-1 text-[11px] font-semibold ${
                  user?.role === "admin"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {user?.role === "admin" ? "Administrator" : "Student"}
              </span>
            </div>

            <div className="px-5 py-5">
              <ProfileImageUpload
                avatarUrl={avatarUrl}
                onUploaded={(url) => setAvatarUrl(url)}
                compact
              />
            </div>
          </div>

          {/* Right: sections */}
          <div className="grid gap-5 xl:grid-cols-2">
            <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <Mail className="h-4 w-4" />
                  <h2 className="text-sm font-semibold text-foreground">Account Information</h2>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 cursor-pointer text-muted-foreground hover:text-foreground"
                  onClick={() => setEditingInfo((v) => !v)}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  {editingInfo ? "Cancel" : "Edit"}
                </Button>
              </div>

              {editingInfo ? (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Name</label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <Button className="h-9 cursor-pointer" onClick={handleSave} disabled={loading}>
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                        </span>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                    {saved && (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium text-foreground">{name || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="break-all font-medium text-foreground">{email || "—"}</span>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-primary">
                <Lock className="h-4 w-4" />
                <h2 className="text-sm font-semibold text-foreground">Security</h2>
              </div>
              <ChangePassword compact />
            </section>

            <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm xl:col-span-2">
              <div className="mb-3 flex items-center gap-2 text-primary">
                <UserIcon className="h-4 w-4" />
                <h2 className="text-sm font-semibold text-foreground">Saved Universities</h2>
              </div>
              <SavedUniversities />
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}
