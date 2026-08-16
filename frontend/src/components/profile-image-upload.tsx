import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface Props {
  avatarUrl?: string | null;
  onUploaded: (url: string | null) => void;
  compact?: boolean;
}

export default function ProfileImageUpload({ avatarUrl, onUploaded, compact }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

    const [file, setFile] = useState<File | null>(null);

  const [readyFile, setReadyFile] = useState<File | null>(null);

  const [compressing, setCompressing] = useState(false);

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

  // Compress/resize an image file client-side so typical phone photos
  // (2–6 MB JPEGs, large PNGs, HEIC exports) fit within the 1.5 MB server
  // limit. Returns a JPEG blob ≤ targetMaxBytes.
  const compressImage = async (file: File, targetMaxBytes = 1024 * 1024): Promise<Blob> => {
    const bitmap = await createImageBitmap(file);
    const maxDim = 1024;
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0, width, height);

    // Iteratively lower JPEG quality until under the size target.
    for (const quality of [0.8, 0.7, 0.6, 0.5, 0.4, 0.3]) {
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b ?? new Blob()), "image/jpeg", quality),
      );
      if (blob.size <= targetMaxBytes) return blob;
    }
    // Fallback: smallest JPEG we can make.
    return await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b ?? new Blob()), "image/jpeg", 0.3),
    );
  };

  // Select image preview and pre-compress it before upload.
  const chooseFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];

    if (!selected) return;

    const previewUrl = URL.createObjectURL(selected);

    setPreview(previewUrl);

    // Compress in the background; keep the original in state until ready.
    setFile(selected);
    setCompressing(true);
    try {
      const compressed = await compressImage(selected);
      // Carry the compressed blob as a File so the upload uses it instead.
      const ready = new File([compressed], selected.name.replace(/\.[^.]+$/, "") + ".jpg", {
        type: "image/jpeg",
      });
      setReadyFile(ready);
    } catch {
      // If compression fails (e.g., unsupported format), fall back to the raw file.
      setReadyFile(selected);
    } finally {
      setCompressing(false);
    }
  };

  // Upload image (uses the compressed file once ready)
  const upload = async () => {
    const toSend = readyFile ?? file;

    if (!toSend) {
      toast.error(compressing ? "Preparing your photo..." : "Please choose image");
      return;
    }

    const formData = new FormData();

    formData.append("file", toSend);

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
      // Parse defensively: if the backend is not deployed behind this domain,
      // /api/* returns the SPA HTML (fallback), and a raw response.json() would
      // surface a confusing parse error instead of a meaningful message.
      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await response.json()
        : null;

      if (!response.ok) {
        throw new Error(
          data?.error
            ? data.error
            : response.status === 400
              ? "The photo could not be processed. Try a smaller photo (under 2 MB) or a JPG/PNG file."
              : response.status === 200
                ? "Upload endpoint not available. Please contact support."
                : `Upload failed (status ${response.status})`,
        );
      }
      if (!data?.avatarUrl) {
        throw new Error("Upload failed");
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

      const response = await fetch("/api/auth/profile/image", {
        method: "DELETE",

        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !contentType.includes("application/json")) {
        throw new Error("Remove failed");
      }

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

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="mb-1 text-xs font-medium text-muted-foreground">Profile Photo</p>
        {file && <p className="text-xs text-muted-foreground">{file.name}</p>}
        <div className="flex w-full gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 cursor-pointer"
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="mr-1 h-4 w-4" />
            {file ? "Change Photo" : "Upload Photo"}
          </Button>
          {file && (
            <Button type="button" size="sm" className="cursor-pointer" onClick={upload} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          )}
          {avatarUrl && !file && (
            <Button type="button" variant="destructive" size="sm" className="cursor-pointer" onClick={remove}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          hidden
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          onChange={chooseFile}
        />
      </div>
    );
  }

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
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        onChange={chooseFile}
      />

      {file && (
        <p className="text-sm text-muted-foreground">
          {file.name}
          {compressing ? " (preparing...)" : readyFile ? " (ready)" : ""}
        </p>
      )}

      <Button onClick={upload} disabled={loading || compressing || !readyFile} className="w-full">
        {compressing ? "Preparing photo..." : loading ? "Uploading..." : "Save Profile Photo"}
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
