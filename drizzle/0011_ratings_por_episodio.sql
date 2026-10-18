ALTER TABLE "ratings" DROP CONSTRAINT "ratings_user_id_title_id_pk";--> statement-breakpoint
ALTER TABLE "ratings" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "ratings" ADD COLUMN "episode_id" uuid;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ratings_user_movie_uidx" ON "ratings" USING btree ("user_id","title_id") WHERE "ratings"."episode_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ratings_user_episode_uidx" ON "ratings" USING btree ("user_id","episode_id") WHERE "ratings"."episode_id" is not null;--> statement-breakpoint
CREATE INDEX "ratings_user_title_idx" ON "ratings" USING btree ("user_id","title_id");
--> statement-breakpoint
-- Escrito à mão: title_id da nota de episódio sempre igual ao título do
-- episódio, pela mesma função do progresso e do histórico (0005). Nota de
-- filme (episode_id nulo) mantém o title_id enviado.
create trigger ratings_set_title
before insert or update of episode_id, title_id on public.ratings
for each row execute function app.set_title_from_episode();