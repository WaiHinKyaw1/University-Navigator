ALTER TABLE "chat_messages" ALTER COLUMN "room_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "parent_id" integer;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_parent_id_chat_messages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."chat_messages"("id") ON DELETE cascade ON UPDATE no action;
