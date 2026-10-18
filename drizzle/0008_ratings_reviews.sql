CREATE TABLE "ratings" (
	"user_id" uuid NOT NULL,
	"title_id" uuid NOT NULL,
	"half_stars" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ratings_user_id_title_id_pk" PRIMARY KEY("user_id","title_id"),
	CONSTRAINT "ratings_half_stars" CHECK ("ratings"."half_stars" between 1 and 10)
);
--> statement-breakpoint
ALTER TABLE "ratings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title_id" uuid NOT NULL,
	"body" text NOT NULL,
	"contains_spoilers" boolean DEFAULT false NOT NULL,
	"moderation_status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_body" CHECK (char_length("reviews"."body") <= 5000 and "reviews"."body" ~ '[^[:space:]]'),
	CONSTRAINT "reviews_moderation_status" CHECK ("reviews"."moderation_status" in ('published', 'hidden', 'removed'))
);
--> statement-breakpoint
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reviews_user_title_created_idx" ON "reviews" USING btree ("user_id","title_id","created_at" DESC NULLS FIRST,"id" DESC NULLS FIRST);--> statement-breakpoint
CREATE POLICY "ratings_all_own" ON "ratings" AS PERMISSIVE FOR ALL TO "authenticated" USING ("ratings"."user_id" = (select app.current_user_id())) WITH CHECK ("ratings"."user_id" = (select app.current_user_id()));--> statement-breakpoint
CREATE POLICY "reviews_all_own" ON "reviews" AS PERMISSIVE FOR ALL TO "authenticated" USING ("reviews"."user_id" = (select app.current_user_id())) WITH CHECK ("reviews"."user_id" = (select app.current_user_id()));