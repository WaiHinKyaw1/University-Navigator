import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface Props {
  avatarUrl?: string | null;
  onUploaded: (url: string | null) => void;
}

export default function ProfileImageUpload({ avatarUrl, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(avatarUrl || "/default-avatar.png");
  const [loading, setLoading] = useState(false);
  const { updateUser } = useAuth();

  // Load image from database after refresh
  useEffect(() => {
    if (avatarUrl) {
      setPreview(avatarUrl);
    } else {
      setPreview("/default-avatar.png");
    }
  }, [avatarUrl]);

  // Select image preview
  const chooseFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];

    if (!selected) return;

    setFile(selected);

    const previewUrl = URL.createObjectURL(selected);

    setPreview(previewUrl);
  };

  // Upload image
  const upload = async () => {
    if (!file) {
      toast.error("Please choose image");
      return;
    }

    const formData = new FormData();

    formData.append("file", file);

    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const response = await fetch("/api/auth/profile/image", {
        method: "POST",

        headers: {
          Authorization: `Bearer ${token}`,
        },

        body: formData,
      });
      console.log(response.status);
      const data = await response.json();
      console.log(data);

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      // update parent state
      onUploaded(data.avatarUrl);

      updateUser({
        avatarUrl: data.avatarUrl,
      });

      // update preview immediately
      setPreview(data.avatarUrl);

      // clear selected file
      setFile(null);

      toast.success("Profile photo updated");
    } catch (error: any) {
      toast.error(error.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  // Remove image
  const remove = async () => {
    try {
      const token = localStorage.getItem("token");

      await fetch("/api/auth/profile/image", {
        method: "DELETE",

        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      updateUser({
        avatarUrl: null,
      });

      setPreview("/default-avatar.png");

      setFile(null);

      onUploaded(null);

      toast.success("Photo removed");
    } catch {
      toast.error("Remove failed");
    }
  };

  return (
    <div className="flex flex-col items-center gap-5 mb-8">
      <div className="relative">
        <img
          src={preview}
          alt="profile"
          className="
            w-40
            h-40
            rounded-full
            object-cover
            border-4
            border-primary/20
            shadow-xl
          "
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="
            absolute
            bottom-2
            right-2
            bg-primary
            text-white
            rounded-full
            p-3
            shadow-lg
            hover:scale-110
            transition
          "
        >
          <Camera size={20} />
        </button>
      </div>

      <input
        ref={inputRef}
        hidden
        type="file"
        accept="image/*"
        onChange={chooseFile}
      />

      {file && <p className="text-sm text-muted-foreground">{file.name}</p>}

      <Button onClick={upload} disabled={loading} className="w-full">
        {loading ? "Uploading..." : "Save Profile Photo"}
      </Button>

      {avatarUrl && (
        <Button variant="destructive" onClick={remove} className="w-full">
          <Trash2 size={16} className="mr-2" />
          Remove Photo
        </Button>
      )}
    </div>
  );
}
