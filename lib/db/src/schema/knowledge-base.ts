import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { admissionGuidesTable } from "./admission-guides";

export const KNOWLEDGE_CATEGORIES = [
  "admission_requirements",
  "score_cutoffs",
  "programs",
  "career_paths",
  "preparation_tips",
  "general",
] as const;

export type KnowledgeCategory = (typeof KNOWLEDGE_CATEGORIES)[number];

export const knowledgeBaseSectionsTable = pgTable("knowledge_base_sections", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull().default("general"),
  academicYear: text("academic_year"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  sourceGuideId: integer("source_guide_id").references(
    () => admissionGuidesTable.id,
    { onDelete: "set null" },
  ),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertKnowledgeBaseSectionSchema = createInsertSchema(
  knowledgeBaseSectionsTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertKnowledgeBaseSection = z.infer<
  typeof insertKnowledgeBaseSectionSchema
>;
export type KnowledgeBaseSection =
  typeof knowledgeBaseSectionsTable.$inferSelect;
