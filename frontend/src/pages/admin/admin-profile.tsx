import { useAuth } from "@/hooks/use-auth";
import ProfileImageUpload from "@/components/profile-image-upload";
import ChangePassword from "@/pages/change-password";
import { Redirect } from "wouter";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminLayout } from "@/components/admin-layout";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminProfile() {
  const { user, updateUser } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

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

      updateUser(data);
      toast.success("Profile updated");
      setEditOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto max-w-3xl px-4 py-10">
        {/* Profile card */}
        <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="h-32 bg-gradient-to-r from-primary via-primary/80 to-secondary sm:h-40" />
          <div className="px-6 pb-6">
            <div className="-mt-14 flex flex-col items-center text-center">
              <ProfileImageUpload avatarUrl={user.avatarUrl} onUploaded={() => {}} />
              <h2 className="mt-3 text-2xl font-bold">{user.name}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <span className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium capitalize text-primary">
                {user.role}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-left">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Name
                </p>
                <p className="mt-1 font-medium">{user.name}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-left">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Email
                </p>
                <p className="mt-1 break-all font-medium">{user.email}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button className="flex-1" onClick={() => setEditOpen(true)}>
                Edit Profile
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setPwOpen(true)}
              >
                Change Password
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password modal */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <ChangePassword compact />
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
