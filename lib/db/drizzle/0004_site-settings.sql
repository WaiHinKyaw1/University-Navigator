CREATE TABLE IF NOT EXISTS "site_settings" (
  "id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
  "project_name" text DEFAULT 'MM Uni Finder' NOT NULL,
  "logo_url" text,
  "tagline" text DEFAULT 'Guiding Myanmar''s Grade 12 students to their future.' NOT NULL,
  "academic_year" text DEFAULT '2024-2025' NOT NULL,
  "contact_email" text,
  "contact_phone" text,
  "welcome_message" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
