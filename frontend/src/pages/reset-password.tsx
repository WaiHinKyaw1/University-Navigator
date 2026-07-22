import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Lock } from "lucide-react";

export default function ResetPassword() {
  const [, setLocation] = useLocation();

  const [password, setPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const token = new URLSearchParams(window.location.search).get("token");

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!token) {
      toast.error("Invalid reset link");

      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");

      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");

      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/auth/reset-password", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          token,

          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      toast.success("Password changed successfully");

      setTimeout(() => {
        setLocation("/login");
      }, 1500);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div
        className="
        flex items-center justify-center
        min-h-[calc(100vh-16rem)]
        px-4
      "
      >
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <Lock className="h-8 w-8 text-primary" />
              </div>
            </div>

            <CardTitle>Reset Password</CardTitle>

            <CardDescription>Enter your new password.</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label>New Password</Label>

                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Confirm Password</Label>

                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <Button className="w-full" disabled={loading}>
                {loading ? "Updating..." : "Reset Password"}
              </Button>
            </form>

            <div className="text-center mt-4">
              <Link
                href="/login"
                className="text-primary hover:underline text-sm"
              >
                Back to login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
