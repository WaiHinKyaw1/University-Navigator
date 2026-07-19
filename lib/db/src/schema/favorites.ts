import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";

import { usersTable } from "./users";
import { universitiesTable } from "./universities";

export const favoritesTable = pgTable("favorites", {
  id: serial("id").primaryKey(),

  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, {
      onDelete: "cascade",
    }),

  universityId: integer("university_id")
    .notNull()
    .references(() => universitiesTable.id, {
      onDelete: "cascade",
    }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});
