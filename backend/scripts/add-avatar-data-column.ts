// Additive-only migration: adds the `avatar_data` TEXT column to the users table
// (nullable, no default) so profile images can be persisted as base64 data URLs.
// This works on serverless deployments (Vercel) where local disk writes are
// ephemeral. Safe to run multiple times (idempotent via IF NOT EXISTS).
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

async function main() {
  const db = drizzle({ connection: DATABASE_URL });
  console.log("Adding avatar_data column if missing...");
  await db.execute(sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS avatar_data TEXT;
  `);
  console.log("Done.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
