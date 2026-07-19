import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (!currentPassword || !newPassword) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const response = await fetch("/api/auth/change-password", {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to change password");
      }

      toast.success("Password changed successfully");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 border rounded-xl p-6 bg-card mt-6">
      <h2 className="text-xl font-bold">Change Password</h2>

      <div>
        <label className="text-sm font-medium">Current Password</label>

        <Input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="mt-2"
          placeholder="Current password"
        />
      </div>

      <div>
        <label className="text-sm font-medium">New Password</label>

        <Input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="mt-2"
          placeholder="New password"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Confirm New Password</label>

        <Input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="mt-2"
          placeholder="Confirm password"
        />
      </div>

      <Button onClick={handleChangePassword} disabled={loading}>
        {loading ? "Changing..." : "Change Password"}
      </Button>
    </div>
  );
}
