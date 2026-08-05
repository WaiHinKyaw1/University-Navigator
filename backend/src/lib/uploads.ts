import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";

// Anchor to the directory of the compiled file (backend/dist/) so this works
// regardless of the working directory the server process is started from.
// In dev (ts-node/tsx), import.meta.url points to backend/src/lib/uploads.ts → go up 3 levels.
// In production (esbuild bundle), __dirname is injected by esbuild's banner → go up 1 level.
const _thisFile =
  typeof __dirname !== "undefined"
    ? __dirname // esbuild production bundle: backend/dist/
    : path.dirname(fileURLToPath(import.meta.url)); // dev: backend/src/lib/

// From backend/dist/ go up 1 level → backend/
// From backend/src/lib/ go up 3 levels → backend/
const apiServerRoot =
  typeof __dirname !== "undefined"
    ? path.resolve(_thisFile, "..")
    : path.resolve(_thisFile, "..", "..", "..");

export const ADMISSION_GUIDE_UPLOAD_DIR = path.join(
  apiServerRoot,
  "uploads",
  "admission-guides",
);

export const IMAGE_UPLOAD_DIR = path.join(
  apiServerRoot,
  "uploads",
  "images",
);

export { apiServerRoot };

export function ensureUploadDirs(): void {
  fs.mkdirSync(ADMISSION_GUIDE_UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(IMAGE_UPLOAD_DIR, { recursive: true });
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

const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadDirs();
    cb(null, IMAGE_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const safeName = sanitizeFileName(file.originalname || "image.png");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

export const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
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

export async function extractPdfText(storedFileName: string): Promise<string> {
  try {
    const filePath = getAdmissionGuideFilePath(storedFileName);
    if (!fs.existsSync(filePath)) return "";

    const pdfModule = await import("pdf-parse");
    const pdfParse = (pdfModule as any).default ?? (pdfModule as any);
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    if (typeof data?.text === "string" && data.text.trim()) {
      return data.text;
    }
  } catch {
    // fall through to python fallback
  }

  try {
    const filePath = getAdmissionGuideFilePath(storedFileName);
    if (!fs.existsSync(filePath)) return "";

    const pythonCommands = process.platform === "win32"
      ? ["py", "-3", "-c", "from pypdf import PdfReader; import sys; reader = PdfReader(sys.argv[1]); text = ''.join((p.extract_text() or '') for p in reader.pages); print(text)"]
      : ["python3", "-c", "from pypdf import PdfReader; import sys; reader = PdfReader(sys.argv[1]); text = ''.join((p.extract_text() or '') for p in reader.pages); print(text)"];

    const stdout = execFileSync(pythonCommands[0], pythonCommands.slice(1).concat(filePath), {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return stdout ?? "";
  } catch {
    return "";
  }
}
