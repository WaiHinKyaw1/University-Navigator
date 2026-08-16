import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

  const handleSave = async () => {
    try {
      setLoading(true);

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
      <div className="container mx-auto max-w-xl px-4 py-6 sm:px-6 sm:py-10">
        <h1 className="mb-6 text-2xl font-bold text-foreground sm:text-3xl">My Profile</h1>
        <ProfileImageUpload
          avatarUrl={avatarUrl}
          onUploaded={(url) => setAvatarUrl(url)}
        />

        <div className="space-y-5 rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Name</label>

            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Email</label>

            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <Button className="min-h-10 w-full sm:w-auto" onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <ChangePassword />

        <SavedUniversities />
      </div>
    </Layout>
  );
}
