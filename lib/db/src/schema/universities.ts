import { pgTable, text, serial, real, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { admissionGuidesTable } from "./admission-guides";

export const universitiesTable = pgTable("universities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameEn: text("name_en").notNull(),
  abbreviation: text("abbreviation"),
  type: text("type").notNull(), // government | private | technical | medical | education
  state: text("state").notNull(),
  city: text("city"),
  minScore: real("min_score").notNull(),
  description: text("description"),
  admissionRequirements: text("admission_requirements"),
  applicationProcess: text("application_process"),
  duration: text("duration"),
  careerOutcomes: text("career_outcomes"),
  website: text("website"),
  imageUrl: text("image_url"),
  sourceGuideId: integer("source_guide_id").references(() => admissionGuidesTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const universityMajorsTable = pgTable("university_majors", {
  id: serial("id").primaryKey(),
  universityId: integer("university_id").notNull().references(() => universitiesTable.id, { onDelete: "cascade" }),
  majorId: integer("major_id").notNull(),
});

export const insertUniversitySchema = createInsertSchema(universitiesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUniversity = z.infer<typeof insertUniversitySchema>;
export type University = typeof universitiesTable.$inferSelect;
