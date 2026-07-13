import { pgTable, text, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),     // Display name, e.g. "Engineering"
  nameEn: text("name_en").notNull().unique(), // Slug / value used in majors.category, e.g. "engineering"
  color: text("color"),                       // Optional badge color hex, e.g. "#3b82f6"
  description: text("description"),
});

export const insertCategorySchema = createInsertSchema(categoriesTable).omit({ id: true });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categoriesTable.$inferSelect;
