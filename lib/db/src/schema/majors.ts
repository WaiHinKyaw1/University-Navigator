import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { admissionGuidesTable } from "./admission-guides";

export const majorsTable = pgTable("majors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameEn: text("name_en").notNull(),
  category: text("category").notNull(), // science | arts | engineering | medical | business | education | law | other
  description: text("description"),
  duration: text("duration"),
  requiredSubjects: text("required_subjects"),
  careerPaths: text("career_paths"),
  sourceGuideId: integer("source_guide_id").references(() => admissionGuidesTable.id, { onDelete: "set null" }),
});

export const insertMajorSchema = createInsertSchema(majorsTable).omit({ id: true });
export type InsertMajor = z.infer<typeof insertMajorSchema>;
export type Major = typeof majorsTable.$inferSelect;
