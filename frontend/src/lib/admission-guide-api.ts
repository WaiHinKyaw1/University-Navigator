import type { AdmissionGuide } from "@workspace/api-client-react";

type UploadAdmissionGuideInput = {
  file: File;
  title?: string;
  academicYear?: string;
};

export async function uploadAdmissionGuide({
  file,
  title,
  academicYear,
}: UploadAdmissionGuideInput): Promise<AdmissionGuide> {
  const formData = new FormData();
  formData.append("file", file);
  if (title?.trim()) formData.append("title", title.trim());
  if (academicYear?.trim()) formData.append("academicYear", academicYear.trim());

  const token = localStorage.getItem("token");
  const response = await fetch("/api/admin/admission-guides", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    let message = "Failed to upload admission guide";
    try {
      const data = await response.json();
      if (typeof data?.error === "string") message = data.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  return response.json();
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
