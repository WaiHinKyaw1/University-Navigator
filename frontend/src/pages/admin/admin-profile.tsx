import { useAuth } from "@/hooks/use-auth";
import ProfileImageUpload from "@/components/profile-image-upload";
import ChangePassword from "@/pages/change-password";
import { Redirect } from "wouter";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminLayout } from "@/components/admin-layout";

export default function AdminProfile() {
  const { user, updateUser } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  if (!user || user.role !== "admin") {
    return <Redirect to="/" />;
  }
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

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      // Update navbar immediately
      updateUser(data);

      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto max-w-xl py-10">
        <h1 className="text-3xl font-bold mb-6">Admin Profile</h1>

        <ProfileImageUpload avatarUrl={user.avatarUrl} onUploaded={() => {}} />

        <div className="space-y-5 border rounded-xl p-6">
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

        <div className="mt-6">
          <ChangePassword />
        </div>
      </div>
    </AdminLayout>
  );
}
