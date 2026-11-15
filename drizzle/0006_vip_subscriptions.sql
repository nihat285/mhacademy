CREATE TYPE "public"."subscription_status" AS ENUM('pending', 'active', 'cancelled');--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(80) NOT NULL,
	"description" text,
	"price_azn" integer DEFAULT 0 NOT NULL,
	"subject_limit" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_subjects" (
	"subscription_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	CONSTRAINT "subscription_subjects_subscription_id_subject_id_pk" PRIMARY KEY("subscription_id","subject_id")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" "subscription_status" DEFAULT 'pending' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exams" ADD COLUMN "is_vip" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "is_vip" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_subjects" ADD CONSTRAINT "subscription_subjects_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_subjects" ADD CONSTRAINT "subscription_subjects_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscriptions_user_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
INSERT INTO "plans" ("name", "description", "price_azn", "subject_limit", "sort_order") VALUES
  ('Aşağı', '1 fənn üzrə bütün VIP dərslər, PDF-lər və sınaqlar', 60, 1, 1),
  ('Orta', '2 fənn üzrə bütün VIP dərslər, PDF-lər və sınaqlar', 120, 2, 2),
  ('Yüksək', 'Bütün fənlər üzrə bütün VIP dərslər, PDF-lər və sınaqlar', 400, NULL, 3);
