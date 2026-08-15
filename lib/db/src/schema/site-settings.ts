import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const siteSettingsTable = pgTable("site_settings", {
  id: integer("id").primaryKey().default(1),
  projectName: text("project_name").notNull().default("MM Uni Finder"),
  logoUrl: text("logo_url"),
  tagline: text("tagline").notNull().default("Guiding Myanmar's Grade 12 students to their future."),
  academicYear: text("academic_year").notNull().default("2024-2025"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  welcomeMessage: text("welcome_message"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertSiteSettingsSchema = createInsertSchema(siteSettingsTable).omit({
  id: true,
  updatedAt: true,
});

export type SiteSettings = typeof siteSettingsTable.$inferSelect;
export type InsertSiteSettings = z.infer<typeof insertSiteSettingsSchema>;
