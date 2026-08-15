import { Router, type IRouter } from "express";
import { db, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

const defaultSettings = {
  projectName: "MM Uni Finder",
  logoUrl: null,
  tagline: "Guiding Myanmar's Grade 12 students to their future.",
  academicYear: "2024-2025",
  contactEmail: null,
  contactPhone: null,
  welcomeMessage: null,
};

router.get("/settings", async (_req, res): Promise<void> => {
  const [settings] = await db
    .select()
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.id, 1))
    .limit(1);

  if (settings) {
    res.json(settings);
    return;
  }

  const [created] = await db
    .insert(siteSettingsTable)
    .values({ id: 1, ...defaultSettings })
    .returning();

  res.json(created);
});

router.put("/admin/settings", requireAdmin, async (req, res): Promise<void> => {
  const {
    projectName,
    logoUrl,
    tagline,
    academicYear,
    contactEmail,
    contactPhone,
    welcomeMessage,
  } = req.body ?? {};

  if (typeof projectName !== "string" || !projectName.trim()) {
    res.status(400).json({ error: "projectName is required" });
    return;
  }

  if (typeof academicYear !== "string" || !academicYear.trim()) {
    res.status(400).json({ error: "academicYear is required" });
    return;
  }

  const values = {
    projectName: projectName.trim(),
    logoUrl: typeof logoUrl === "string" && logoUrl.trim() ? logoUrl.trim() : null,
    tagline: typeof tagline === "string" ? tagline.trim() : "",
    academicYear: academicYear.trim(),
    contactEmail: typeof contactEmail === "string" && contactEmail.trim() ? contactEmail.trim() : null,
    contactPhone: typeof contactPhone === "string" && contactPhone.trim() ? contactPhone.trim() : null,
    welcomeMessage:
      typeof welcomeMessage === "string" && welcomeMessage.trim() ? welcomeMessage.trim() : null,
  };

  const [settings] = await db
    .insert(siteSettingsTable)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({
      target: siteSettingsTable.id,
      set: values,
    })
    .returning();

  res.json(settings);
});

export default router;
