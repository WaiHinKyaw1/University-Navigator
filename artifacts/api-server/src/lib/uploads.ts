import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";

const apiServerRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

export const ADMISSION_GUIDE_UPLOAD_DIR = path.join(
  apiServerRoot,
  "uploads",
  "admission-guides",
);

export function ensureUploadDirs(): void {
  fs.mkdirSync(ADMISSION_GUIDE_UPLOAD_DIR, { recursive: true });
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadDirs();
    cb(null, ADMISSION_GUIDE_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const safeName = sanitizeFileName(file.originalname || "admission-guide.pdf");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

export const admissionGuideUpload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new Error("Only PDF files are allowed"));
      return;
    }
    cb(null, true);
  },
});

export function getAdmissionGuideFilePath(storedFileName: string): string {
  return path.join(ADMISSION_GUIDE_UPLOAD_DIR, storedFileName);
}

export function deleteAdmissionGuideFile(storedFileName: string): void {
  const filePath = getAdmissionGuideFilePath(storedFileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
