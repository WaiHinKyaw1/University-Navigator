import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, User as UserIcon, Mail, Lock, Loader2, CheckCircle2 } from "lucide-react";

import { toast } from "sonner";

import ChangePassword from "@/pages/change-password";
import SavedUniversities from "@/components/saved-universities";
import ProfileImageUpload from "@/components/profile-image-upload";

function ProfileSectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4">
      <div className="mb-1 flex items-center gap-2 text-primary">
        {icon}
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();

  const [name, setName] = useState(user?.name || "");

  const [email, setEmail] = useState(user?.email || "");

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const [saved, setSaved] = useState(false);

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

  return (
    <Layout>
      <div className="container mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <UserIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">My Profile</h1>
            <p className="text-sm text-muted-foreground">ကိုယ်အကောင့်အချက်အလက်နဲ့ သိမ်းထားသော တက္ကသိုလ်များ</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-6">
            <ProfileSectionHeader
              icon={<UserIcon className="h-5 w-5" />}
              title="Avatar"
              description="Profile ပုံကို ပြောင်းလဲနိုင်ပါတယ်။"
            />
            <ProfileImageUpload
              avatarUrl={avatarUrl}
              onUploaded={(url) => setAvatarUrl(url)}
            />
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-6">
            <ProfileSectionHeader
              icon={<Mail className="h-5 w-5" />}
              title="Account Information"
              description="အမည်နဲ့ အီးမေးလ်ကို ဖြည့်သွင်းပြီး သိမ်းဆည်းပါ။"
            />
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Name</label>

                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Email</label>

                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Button className="min-h-10 flex-1 sm:flex-none" onClick={handleSave} disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                    </span>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                {saved && (
                  <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" /> Saved
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-6">
            <ProfileSectionHeader
              icon={<Lock className="h-5 w-5" />}
              title="Security"
              description="စကားဝှက် ပြောင်းလဲနိုင်ပါတယ်။"
            />
            <ChangePassword />
          </div>

          <section>
            <div className="mb-4 flex items-center gap-2">
              <Heart className="h-4 w-4 fill-current text-rose-500" />
              <h2 className="text-lg font-semibold text-foreground">Saved Universities</h2>
            </div>
            <SavedUniversities />
          </section>
        </div>
      </div>
    </Layout>
  );
}
