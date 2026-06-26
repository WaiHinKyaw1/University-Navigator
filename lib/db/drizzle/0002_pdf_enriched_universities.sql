ALTER TABLE "universities" ADD COLUMN "admission_requirements" text;--> statement-breakpoint
ALTER TABLE "universities" ADD COLUMN "application_process" text;--> statement-breakpoint
ALTER TABLE "universities" ADD COLUMN "duration" text;--> statement-breakpoint
ALTER TABLE "universities" ADD COLUMN "career_outcomes" text;--> statement-breakpoint
ALTER TABLE "universities" ADD COLUMN "source_guide_id" integer;--> statement-breakpoint
ALTER TABLE "majors" ADD COLUMN "duration" text;--> statement-breakpoint
ALTER TABLE "majors" ADD COLUMN "required_subjects" text;--> statement-breakpoint
ALTER TABLE "majors" ADD COLUMN "career_paths" text;--> statement-breakpoint
ALTER TABLE "majors" ADD COLUMN "source_guide_id" integer;--> statement-breakpoint
ALTER TABLE "universities" ADD CONSTRAINT "universities_source_guide_id_admission_guides_id_fk" FOREIGN KEY ("source_guide_id") REFERENCES "public"."admission_guides"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "majors" ADD CONSTRAINT "majors_source_guide_id_admission_guides_id_fk" FOREIGN KEY ("source_guide_id") REFERENCES "public"."admission_guides"("id") ON DELETE set null ON UPDATE no action;
