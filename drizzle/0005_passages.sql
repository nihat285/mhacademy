CREATE TABLE "question_passage_links" (
	"question_id" uuid PRIMARY KEY NOT NULL,
	"passage_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_passages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid,
	"author_id" uuid,
	"title" varchar(160) NOT NULL,
	"body" text,
	"audio_url" text,
	"transcript" text,
	"max_plays" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "passages_content_ck" CHECK ("question_passages"."body" is not null or "question_passages"."audio_url" is not null),
	CONSTRAINT "passages_plays_ck" CHECK ("question_passages"."max_plays" is null or "question_passages"."max_plays" between 1 and 10)
);
--> statement-breakpoint
ALTER TABLE "question_passage_links" ADD CONSTRAINT "question_passage_links_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_passage_links" ADD CONSTRAINT "question_passage_links_passage_id_question_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."question_passages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_passages" ADD CONSTRAINT "question_passages_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_passages" ADD CONSTRAINT "question_passages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "passage_links_passage_idx" ON "question_passage_links" USING btree ("passage_id");--> statement-breakpoint
CREATE INDEX "passages_subject_idx" ON "question_passages" USING btree ("subject_id");