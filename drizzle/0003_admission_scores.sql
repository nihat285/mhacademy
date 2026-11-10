CREATE TABLE "admission_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"group_no" integer NOT NULL,
	"lang" varchar(2) NOT NULL,
	"university" varchar(240) NOT NULL,
	"code" varchar(8) NOT NULL,
	"name" varchar(400) NOT NULL,
	"study_form" varchar(4) NOT NULL,
	"special" integer DEFAULT 0 NOT NULL,
	"score_text" varchar(20),
	"state_text" varchar(20),
	"paid_only" boolean DEFAULT false NOT NULL,
	"score" numeric(6, 1),
	"state_score" numeric(6, 1),
	"sub_score" varchar(20),
	"sub_state" varchar(20)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "admission_year_code_lang_uq" ON "admission_scores" USING btree ("year","code","lang");--> statement-breakpoint
CREATE INDEX "admission_year_group_idx" ON "admission_scores" USING btree ("year","group_no");--> statement-breakpoint
CREATE INDEX "admission_university_idx" ON "admission_scores" USING btree ("university");