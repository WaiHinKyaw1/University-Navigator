import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const interestGuideOptionsTable = pgTable("interest_guide_options", {
  id: serial("id").primaryKey(),

  category: text("category").notNull(),

  code: text("code").notNull(),

  name: text("name").notNull(),

  description: text("description"),

  isActive: boolean("is_active").notNull().default(true),

  displayOrder: integer("display_order").notNull().default(0),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertInterestGuideOptionSchema = createInsertSchema(
  interestGuideOptionsTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInterestGuideOption = z.infer<
  typeof insertInterestGuideOptionSchema
>;

export type InterestGuideOption = typeof interestGuideOptionsTable.$inferSelect;
