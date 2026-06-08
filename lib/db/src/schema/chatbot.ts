import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const chatbotMessagesTable = pgTable("chatbot_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  sessionId: text("session_id").notNull(),
  role: text("role").notNull(), // user | assistant
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertChatbotMessageSchema = createInsertSchema(chatbotMessagesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertChatbotMessage = z.infer<typeof insertChatbotMessageSchema>;
export type ChatbotMessage = typeof chatbotMessagesTable.$inferSelect;
