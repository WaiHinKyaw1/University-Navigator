import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, admissionGuidesTable, usersTable } from "@workspace/db";
import { importAdmissionDataFromPdfText } from "../lib/pdf-structured-import";
import { extractPdfText } from "../lib/uploads";

async function extractTextWithFallback(filePath: string): Promise<string> {
  const fromHelper = await extractPdfText(path.basename(filePath));
  if (fromHelper.trim()) return fromHelper;

  try {
    const pythonCommand = process.platform === "win32"
      ? ["python", "-c", "from pypdf import PdfReader; import sys; reader = PdfReader(sys.argv[1]); text = ''.join((p.extract_text() or '') for p in reader.pages); sys.stdout.write(text)"]
      : ["python3", "-c", "from pypdf import PdfReader; import sys; reader = PdfReader(sys.argv[1]); text = ''.join((p.extract_text() or '') for p in reader.pages); sys.stdout.write(text)"];
    const stdout = execFileSync(pythonCommand[0], pythonCommand.slice(1).concat(filePath), {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return stdout ?? "";
  } catch (error) {
    console.error("Python extraction failed", error);
    try {
      const stdout = execFileSync("py", ["-3", "-c", "from pypdf import PdfReader; import sys; reader = PdfReader(sys.argv[1]); text = ''.join((p.extract_text() or '') for p in reader.pages); sys.stdout.write(text)", filePath], {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      return stdout ?? "";
    } catch (fallbackError) {
      console.error("Py fallback extraction failed", fallbackError);
      return "";
    }
  }
}

async function main() {
  const candidateDirs = [
    path.resolve(process.cwd(), "backend", "uploads", "admission-guides"),
    path.resolve(process.cwd(), "uploads", "admission-guides"),
    path.resolve(process.cwd(), "src", "uploads", "admission-guides"),
  ];
  const uploadsDir = candidateDirs.find((dir) => fs.existsSync(dir));
  if (!uploadsDir) {
    throw new Error("No uploads/admission-guides directory found");
  }
  const files = fs.readdirSync(uploadsDir).filter((name) => name.toLowerCase().endsWith(".pdf"));

  if (files.length === 0) {
    console.error("No PDF files found in uploads/admission-guides");
    process.exit(1);
  }

  const fileName = files[0];
  const filePath = path.join(uploadsDir, fileName);
  console.log(`Using PDF: ${fileName}`);

  const [existingGuide] = await db
    .select()
    .from(admissionGuidesTable)
    .where(eq(admissionGuidesTable.fileName, fileName))
    .limit(1);

  let guideId: number;
  if (existingGuide) {
    guideId = existingGuide.id;
  } else {
    const [user] = await db.select().from(usersTable).orderBy(usersTable.id).limit(1);
    if (!user) {
      throw new Error("No user found to attach the guide to");
    }

    const [insertedGuide] = await db
      .insert(admissionGuidesTable)
      .values({
        title: "Imported from PDF",
        fileName,
        storedFileName: fileName,
        fileSize: fs.statSync(filePath).size,
        mimeType: "application/pdf",
        isActive: true,
        uploadedById: user.id,
      })
      .returning();

    guideId = insertedGuide.id;
  }

  const rawText = await extractTextWithFallback(filePath);
  if (!rawText.trim()) {
    throw new Error("PDF text extraction returned empty text");
  }

  const result = await importAdmissionDataFromPdfText(rawText, guideId);
  console.log(JSON.stringify(result));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
