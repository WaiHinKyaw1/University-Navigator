import { Router, type IRouter } from "express";
import { auditLogsTable, db, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

const DEFAULT_SETTINGS = {
  projectName: "MM Uni Finder",
  logoUrl: null,
  tagline: "Guiding Myanmar's Grade 12 students to their future.",
  academicYear: "2024-2025",
  contactEmail: null,
  contactPhone: null,
  welcomeMessage: null,
  welcomeIntro: null,
  welcomeDescription: null,
  maintenanceMode: false,
  maintenanceMessage: "We are making a few improvements. Please check back soon.",
} as const;

const MAX_LENGTHS = {
  projectName: 80,
  tagline: 200,
  academicYear: 40,
  contactEmail: 160,
  contactPhone: 40,
  welcomeMessage: 1000,
  welcomeIntro: 500,
  welcomeDescription: 2000,
  maintenanceMessage: 240,
} as const;

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned || null;
}

function hasControlCharacters(value: string): boolean {
  return /[\u0000-\u001F\u007F]/.test(value);
}

function validateTextField(
  field: keyof typeof MAX_LENGTHS,
  value: string | null,
  required = false,
): string | null {
  if (required && !value) return `${field} is required`;
  if (value && (value.length > MAX_LENGTHS[field] || hasControlCharacters(value))) {
    return `${field} is invalid or too long`;
  }
  return null;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Allow external http(s) URLs, inline base64 data URLs, and relative paths to
// images served by this API (e.g. /uploads/images/123-still_developing.png
// returned by the image upload endpoint). Relative paths are matched broadly
// (must start with /uploads/images/ and contain no whitespace) so any file the
// upload endpoint produces passes validation regardless of extension or query
// parameters. Query strings are stripped before saving for cleanliness.
function isValidLogoUrl(value: string): boolean {
  return (
    /^https?:\/\/[^\s]+$/i.test(value) ||
    /^data:image\/(png|jpeg|webp|svg\+xml);base64,/i.test(value) ||
    /^\/uploads\/images\/[^\s?]+(\?[\S]*)?$/i.test(value)
  );
}

function normalizeRelativeUrl(value: string): string {
  return value.replace(/\?[\S]*$/, "");
}

async function getOrCreateSettings() {
  const [settings] = await db
    .select()
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.id, 1))
    .limit(1);

  if (settings) return settings;

  const [created] = await db
    .insert(siteSettingsTable)
    .values({ id: 1, ...DEFAULT_SETTINGS })
    .returning();

  return created;
}

router.get("/settings", async (_req, res): Promise<void> => {
  const settings = await getOrCreateSettings();
  res.json(settings);
});

router.put("/admin/settings", requireAdmin, async (req, res): Promise<void> => {
  const body = req.body ?? {};
  const projectName = cleanText(body.projectName);
  const tagline = cleanText(body.tagline) ?? "";
  const academicYear = cleanText(body.academicYear);
  const contactEmail = cleanText(body.contactEmail);
  const contactPhone = cleanText(body.contactPhone);
  const welcomeMessage = cleanText(body.welcomeMessage);
  const welcomeIntro = cleanText(body.welcomeIntro);
  const welcomeDescription = cleanText(body.welcomeDescription);
  const maintenanceMessage = cleanText(body.maintenanceMessage) ?? DEFAULT_SETTINGS.maintenanceMessage;
  const maintenanceMode = body.maintenanceMode === true;
  let logoUrl = cleanText(body.logoUrl);
  if (logoUrl && !logoUrl.startsWith("http") && !logoUrl.startsWith("data:")) {
    logoUrl = normalizeRelativeUrl(logoUrl);
  }

  const validationError =
    validateTextField("projectName", projectName, true) ??
    validateTextField("tagline", tagline) ??
    validateTextField("academicYear", academicYear, true) ??
    validateTextField("contactEmail", contactEmail) ??
    validateTextField("contactPhone", contactPhone) ??
    validateTextField("welcomeMessage", welcomeMessage) ??
    validateTextField("welcomeIntro", welcomeIntro) ??
    validateTextField("welcomeDescription", welcomeDescription) ??
    validateTextField("maintenanceMessage", maintenanceMessage, true);

  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  if (contactEmail && !isValidEmail(contactEmail)) {
    res.status(400).json({ error: "contactEmail must be a valid email address" });
    return;
  }

  if (logoUrl && !isValidLogoUrl(logoUrl)) {
    res.status(400).json({ error: "logoUrl must be a valid http(s) image URL" });
    return;
  }

  const current = await getOrCreateSettings();
  const values = {
    projectName: projectName as string,
    logoUrl,
    tagline,
    academicYear: academicYear as string,
    contactEmail,
    contactPhone,
    welcomeMessage,
    welcomeIntro,
    welcomeDescription,
    maintenanceMode,
    maintenanceMessage,
  };
  const changedFields = Object.keys(values).filter((key) => {
    const field = key as keyof typeof values;
    return current[field] !== values[field];
  });

  const settings = await db.transaction(async (tx) => {
    const [updated] = await tx
      .insert(siteSettingsTable)
      .values({ id: 1, ...values })
      .onConflictDoUpdate({
        target: siteSettingsTable.id,
        set: values,
      })
      .returning();

    await tx.insert(auditLogsTable).values({
      adminId: req.user!.id,
      action: "update_settings",
      targetType: "site_settings",
      targetId: 1,
      details: JSON.stringify({ changedFields }),
    });

    return updated;
  });

  res.json(settings);
});

export default router;
