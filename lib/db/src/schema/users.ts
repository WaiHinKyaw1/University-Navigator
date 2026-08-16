import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("student"), // student | admin
  status: text("status").notNull().default("active"), // active | banned
  banReason: text("ban_reason"),
  avatarUrl: text("avatar_url"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  sessionVersion: integer("session_version").default(0).notNull(),

  verificationToken: text("verification_token"),

  verificationTokenExpiresAt: timestamp("verification_token_expires_at", {
    withTimezone: true,
  }),
  resetPasswordToken: text("reset_password_token"),

  resetPasswordTokenExpiresAt: timestamp("reset_password_token_expires_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
