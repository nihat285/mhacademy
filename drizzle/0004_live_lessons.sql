CREATE TYPE "public"."live_provider" AS ENUM('zoom', 'meet', 'teams', 'other');--> statement-breakpoint
CREATE TYPE "public"."live_status" AS ENUM('scheduled', 'cancelled');--> statement-breakpoint
CREATE TABLE "live_joins" (
	"session_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "live_joins_session_id_student_id_pk" PRIMARY KEY("session_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "live_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"title" varchar(160) NOT NULL,
	"description" text,
	"starts_at" timestamp with time zone NOT NULL,
	"duration_min" integer DEFAULT 60 NOT NULL,
	"provider" "live_provider" DEFAULT 'other' NOT NULL,
	"join_url" text NOT NULL,
	"passcode" varchar(40),
	"status" "live_status" DEFAULT 'scheduled' NOT NULL,
	"recording_url" text,
	"reminded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "live_duration_ck" CHECK ("live_sessions"."duration_min" between 15 and 240)
);
--> statement-breakpoint
ALTER TABLE "live_joins" ADD CONSTRAINT "live_joins_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."live_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_joins" ADD CONSTRAINT "live_joins_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_class_id_class_groups_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."class_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "live_class_start_idx" ON "live_sessions" USING btree ("class_id","starts_at");--> statement-breakpoint
CREATE INDEX "live_teacher_idx" ON "live_sessions" USING btree ("teacher_id");