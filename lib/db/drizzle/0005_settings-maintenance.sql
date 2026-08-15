ALTER TABLE "site_settings"
  ADD COLUMN IF NOT EXISTS "maintenance_mode" boolean NOT NULL DEFAULT false;

ALTER TABLE "site_settings"
  ADD COLUMN IF NOT EXISTS "maintenance_message" text NOT NULL DEFAULT 'We are making a few improvements. Please check back soon.';
