CREATE TABLE "episodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"episode_number" integer NOT NULL,
	"name" text,
	"overview" text,
	"air_date" date,
	"runtime" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "episodes_season_number_key" UNIQUE("season_id","episode_number"),
	CONSTRAINT "episodes_number" CHECK ("episodes"."episode_number" >= 0),
	CONSTRAINT "episodes_runtime" CHECK ("episodes"."runtime" is null or "episodes"."runtime" >= 0)
);
--> statement-breakpoint
ALTER TABLE "episodes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "external_ids" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"entity_type" text NOT NULL,
	"external_id" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "external_ids_provider_entity_key" UNIQUE("provider","entity_type","external_id"),
	CONSTRAINT "external_ids_entity_type" CHECK ("external_ids"."entity_type" in ('movie', 'tv', 'genre'))
);
--> statement-breakpoint
ALTER TABLE "external_ids" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "genres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "genres" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "provider_payloads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"resource" text NOT NULL,
	"payload" jsonb NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "provider_payloads_provider_resource_key" UNIQUE("provider","resource")
);
--> statement-breakpoint
ALTER TABLE "provider_payloads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title_id" uuid NOT NULL,
	"season_number" integer NOT NULL,
	"name" text,
	"overview" text,
	"air_date" date,
	"poster_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seasons_title_number_key" UNIQUE("title_id","season_number"),
	CONSTRAINT "seasons_number" CHECK ("seasons"."season_number" >= 0)
);
--> statement-breakpoint
ALTER TABLE "seasons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "title_genres" (
	"title_id" uuid NOT NULL,
	"genre_id" uuid NOT NULL,
	CONSTRAINT "title_genres_title_id_genre_id_pk" PRIMARY KEY("title_id","genre_id")
);
--> statement-breakpoint
ALTER TABLE "title_genres" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "title_translations" (
	"title_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"title" text NOT NULL,
	"overview" text,
	"poster_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "title_translations_title_id_locale_pk" PRIMARY KEY("title_id","locale")
);
--> statement-breakpoint
ALTER TABLE "title_translations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "titles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_type" text NOT NULL,
	"original_title" text NOT NULL,
	"original_language" text,
	"release_date" date,
	"runtime" integer,
	"status" text DEFAULT 'unknown' NOT NULL,
	"backdrop_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "titles_media_type" CHECK ("titles"."media_type" in ('movie', 'tv')),
	CONSTRAINT "titles_status" CHECK ("titles"."status" in ('planned', 'in_production', 'released', 'returning', 'ended', 'canceled', 'unknown')),
	CONSTRAINT "titles_runtime" CHECK ("titles"."runtime" is null or "titles"."runtime" >= 0)
);
--> statement-breakpoint
ALTER TABLE "titles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "title_genres" ADD CONSTRAINT "title_genres_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "title_genres" ADD CONSTRAINT "title_genres_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "title_translations" ADD CONSTRAINT "title_translations_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "episodes_season_air_date_idx" ON "episodes" USING btree ("season_id","air_date","episode_number");--> statement-breakpoint
CREATE INDEX "external_ids_entity_id_idx" ON "external_ids" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "provider_payloads_expires_at_idx" ON "provider_payloads" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "title_genres_genre_id_idx" ON "title_genres" USING btree ("genre_id");--> statement-breakpoint
CREATE POLICY "episodes_select_authenticated" ON "episodes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "genres_select_authenticated" ON "genres" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "seasons_select_authenticated" ON "seasons" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "title_genres_select_authenticated" ON "title_genres" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "title_translations_select_authenticated" ON "title_translations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "titles_select_authenticated" ON "titles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);