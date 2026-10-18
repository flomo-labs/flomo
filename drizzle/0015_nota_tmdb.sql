ALTER TABLE "titles" ADD COLUMN "tmdb_vote_average" numeric(3, 1);--> statement-breakpoint
ALTER TABLE "titles" ADD COLUMN "tmdb_vote_count" integer;--> statement-breakpoint
ALTER TABLE "titles" ADD CONSTRAINT "titles_tmdb_vote_average" CHECK ("titles"."tmdb_vote_average" is null or "titles"."tmdb_vote_average" between 0 and 10);--> statement-breakpoint
ALTER TABLE "titles" ADD CONSTRAINT "titles_tmdb_vote_count" CHECK ("titles"."tmdb_vote_count" is null or "titles"."tmdb_vote_count" >= 0);