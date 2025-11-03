ALTER TABLE "users" ADD COLUMN "email" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_image_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "theme" varchar(50) DEFAULT 'modern';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "custom_font" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ui_preferences" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");