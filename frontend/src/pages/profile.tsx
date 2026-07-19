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
      <div className="container mx-automax-w-xl py-10">
        <h1 className="text-3xl font-bold mb-6">My Profile</h1>
        <ProfileImageUpload
          avatarUrl={avatarUrl}
          onUploaded={(url) => setAvatarUrl(url)}
        />

        <div className="space-y-5 border rounded-xlp-6 bg-card">
          <div>
            <label>Name</label>

            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label>Email</label>

            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <ChangePassword />

        <SavedUniversities />
      </div>
    </Layout>
  );
}
