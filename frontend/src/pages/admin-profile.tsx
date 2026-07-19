import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import ProfileImageUpload from "@/components/profile-image-upload";
import ChangePassword from "@/pages/change-password";
import { Redirect } from "wouter";

export default function AdminProfile() {
  const { user } = useAuth();

  if (!user || user.role !== "admin") {
    return <Redirect to="/" />;
  }

  return (
    <Layout>
      <div className="container mx-auto max-w-xl py-10">
        <h1 className="text-3xl font-bold mb-6">Admin Profile</h1>

        <ProfileImageUpload avatarUrl={user.avatarUrl} onUploaded={() => {}} />

        <div className="mt-6">
          <ChangePassword />
        </div>
      </div>
    </Layout>
  );
}
