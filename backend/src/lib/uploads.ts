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

// Detect real image files by magic bytes so uploads with a wrong or missing
// MIME type (e.g. phone photos reporting "image/heic" or "application/octet-stream")
// are still accepted when their contents are actually a supported image.
function isRealImageByMagicBytes(buffer: Buffer): boolean {
  const signatures: [number, number[]][] = [
    [0, [0x89, 0x50, 0x4e, 0x47]], // PNG
    [0, [0xff, 0xd8, 0xff]], // JPEG
    [0, [0x52, 0x49, 0x46, 0x46]], // WEBP (RIFF header, WEBP checked below)
    [0, [0x47, 0x49, 0x46, 0x38]], // GIF
  ];
  for (const [offset, sig] of signatures) {
    if (buffer.length < offset + sig.length) continue;
    if (sig.every((b, i) => buffer[offset + i] === b)) {
      // WEBP: RIFF header must contain WEBP at offset 8.
      if (sig[0] === 0x52) {
        return (
          buffer.length >= 12 &&
          buffer[8] === 0x57 &&
          buffer[9] === 0x45 &&
          buffer[10] === 0x42 &&
          buffer[11] === 0x50
        );
      }
      return true;
    }
  }
  return false;
}

// Accept anything reported as an image type (or with an ambiguous/missing type
// like "application/octet-stream"). The upload route validates the actual
// content by magic bytes after the file is written, so wrong MIME types are
// caught there without rejecting legitimate phone photos with odd types.
export const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
      return;
    }
    if (!file.mimetype || file.mimetype === "application/octet-stream") {
      cb(null, true);
      return;
    }
    cb(new Error("Only image files are allowed"));
  },
});

// Verify the written file actually contains an image (PNG/JPEG/WEBP/GIF).
// Use this in upload routes to catch uploads whose MIME type lied about the
// contents (e.g. a text or executable file renamed to .png).
export function verifyImageContent(filePath: string): boolean {
  try {
    const head = fs.readFileSync(filePath, { flag: "r" }).subarray(0, 16);
    return isRealImageByMagicBytes(head);
  } catch {
    return false;
  }
}

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
