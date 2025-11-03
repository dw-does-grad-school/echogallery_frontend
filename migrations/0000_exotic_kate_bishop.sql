CREATE TABLE "users" (
	"user_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
