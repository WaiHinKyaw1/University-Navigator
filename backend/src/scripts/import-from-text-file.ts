import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, admissionGuidesTable, usersTable } from "@workspace/db";
import { importAdmissionDataFromPdfText } from "../lib/pdf-structured-import";

async function main() {
  const pdfPath = path.resolve(process.cwd(), "backend", "uploads", "admission-guides", "1782454658702-University_Admission_Guide_2025.pdf");
  const textPath = path.resolve(process.cwd(), "backend", "uploads", "admission-guides", "1782454658702-University_Admission_Guide_2025.txt");

  if (!fs.existsSync(textPath)) {
    throw new Error(`Text file not found at ${textPath}`);
  }

  const rawText = fs.readFileSync(textPath, "utf-8");
  if (!rawText.trim()) {
    throw new Error("Text file is empty");
  }

  const [existingGuide] = await db
    .select()
    .from(admissionGuidesTable)
    .where(eq(admissionGuidesTable.fileName, "1782454658702-University_Admission_Guide_2025.pdf"))
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
        fileName: path.basename(pdfPath),
        storedFileName: path.basename(pdfPath),
        fileSize: fs.statSync(pdfPath).size,
        mimeType: "application/pdf",
        isActive: true,
        uploadedById: user.id,
      })
      .returning();

    guideId = insertedGuide.id;
  }

  const result = await importAdmissionDataFromPdfText(rawText, guideId);
  console.log(JSON.stringify(result));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
