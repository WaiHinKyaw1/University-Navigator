ALTER TABLE "site_settings"
  ADD COLUMN IF NOT EXISTS "welcome_intro" text;
ALTER TABLE "site_settings"
  ADD COLUMN IF NOT EXISTS "welcome_description" text;
