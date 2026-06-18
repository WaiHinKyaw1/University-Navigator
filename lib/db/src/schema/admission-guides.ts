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
import { usersTable } from "./users";

export const admissionGuidesTable = pgTable("admission_guides", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  academicYear: text("academic_year"),
  fileName: text("file_name").notNull(),
  storedFileName: text("stored_file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull().default("application/pdf"),
  isActive: boolean("is_active").notNull().default(false),
  uploadedById: integer("uploaded_by_id")
    .notNull()
    .references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertAdmissionGuideSchema = createInsertSchema(
  admissionGuidesTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAdmissionGuide = z.infer<typeof insertAdmissionGuideSchema>;
export type AdmissionGuide = typeof admissionGuidesTable.$inferSelect;
