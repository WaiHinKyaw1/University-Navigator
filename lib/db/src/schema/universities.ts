import { index, pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { admissionGuidesTable } from "./admission-guides";

export const universitiesTable = pgTable(
  "universities",
  {
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
  },
  (table) => ({
    nameIdx: index("universities_name_idx").on(table.name),
    nameEnIdx: index("universities_name_en_idx").on(table.nameEn),
    typeIdx: index("universities_type_idx").on(table.type),
    stateIdx: index("universities_state_idx").on(table.state),
    minScoreIdx: index("universities_min_score_idx").on(table.minScore),
  }),
);

export const universityMajorsTable = pgTable(
  "university_majors",
  {
  id: serial("id").primaryKey(),
  universityId: integer("university_id").notNull().references(() => universitiesTable.id, { onDelete: "cascade" }),
  majorId: integer("major_id").notNull(),
  },
  (table) => ({
    universityIdIdx: index("university_majors_university_id_idx").on(table.universityId),
  }),
);

export const insertUniversitySchema = createInsertSchema(universitiesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUniversity = z.infer<typeof insertUniversitySchema>;
export type University = typeof universitiesTable.$inferSelect;
