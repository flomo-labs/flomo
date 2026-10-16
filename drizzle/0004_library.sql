CREATE TABLE "user_episode_progress" (
	"user_id" uuid NOT NULL,
	"episode_id" uuid NOT NULL,
	"title_id" uuid NOT NULL,
	"watched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_episode_progress_user_id_episode_id_pk" PRIMARY KEY("user_id","episode_id")
);
--> statement-breakpoint
ALTER TABLE "user_episode_progress" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_titles" (
	"user_id" uuid NOT NULL,
	"title_id" uuid NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_titles_user_id_title_id_pk" PRIMARY KEY("user_id","title_id"),
	CONSTRAINT "user_titles_status" CHECK ("user_titles"."status" in ('watchlist', 'watching', 'paused', 'watched', 'dropped'))
);
--> statement-breakpoint
ALTER TABLE "user_titles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "watch_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title_id" uuid NOT NULL,
	"episode_id" uuid,
	"watched_at" timestamp with time zone,
	"watched_at_precision" text NOT NULL,
	"source" text NOT NULL,
	"rating_half_stars" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "watch_events_precision" CHECK ("watch_events"."watched_at_precision" in ('exact', 'day', 'month', 'year', 'unknown')),
	CONSTRAINT "watch_events_precision_matches_date" CHECK (("watch_events"."watched_at" is null) = ("watch_events"."watched_at_precision" = 'unknown')),
	CONSTRAINT "watch_events_source" CHECK ("watch_events"."source" in ('live', 'backfill', 'import_trakt', 'import_tvtime', 'import_letterboxd', 'import_csv')),
	CONSTRAINT "watch_events_rating" CHECK ("watch_events"."rating_half_stars" is null or "watch_events"."rating_half_stars" between 1 and 10)
);
--> statement-breakpoint
ALTER TABLE "watch_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_episode_progress" ADD CONSTRAINT "user_episode_progress_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_episode_progress" ADD CONSTRAINT "user_episode_progress_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_episode_progress" ADD CONSTRAINT "user_episode_progress_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_titles" ADD CONSTRAINT "user_titles_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_titles" ADD CONSTRAINT "user_titles_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_events" ADD CONSTRAINT "watch_events_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_events" ADD CONSTRAINT "watch_events_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_events" ADD CONSTRAINT "watch_events_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_episode_progress_user_title_idx" ON "user_episode_progress" USING btree ("user_id","title_id");--> statement-breakpoint
CREATE INDEX "user_titles_user_status_updated_idx" ON "user_titles" USING btree ("user_id","status","updated_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "watch_events_user_watched_at_idx" ON "watch_events" USING btree ("user_id","watched_at" DESC NULLS LAST,"id" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "watch_events_user_episode_idx" ON "watch_events" USING btree ("user_id","episode_id");--> statement-breakpoint
CREATE INDEX "watch_events_user_title_idx" ON "watch_events" USING btree ("user_id","title_id");--> statement-breakpoint
CREATE POLICY "user_episode_progress_all_own" ON "user_episode_progress" AS PERMISSIVE FOR ALL TO "authenticated" USING ("user_episode_progress"."user_id" = (select app.current_user_id())) WITH CHECK ("user_episode_progress"."user_id" = (select app.current_user_id()));--> statement-breakpoint
CREATE POLICY "user_titles_all_own" ON "user_titles" AS PERMISSIVE FOR ALL TO "authenticated" USING ("user_titles"."user_id" = (select app.current_user_id())) WITH CHECK ("user_titles"."user_id" = (select app.current_user_id()));--> statement-breakpoint
CREATE POLICY "watch_events_all_own" ON "watch_events" AS PERMISSIVE FOR ALL TO "authenticated" USING ("watch_events"."user_id" = (select app.current_user_id())) WITH CHECK ("watch_events"."user_id" = (select app.current_user_id()));