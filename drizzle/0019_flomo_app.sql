-- Usuário do app no banco, sem poder de administrador (Fase 1.6).
--
-- Até aqui o app se conectava como `postgres`, dono das tabelas: um erro de
-- código ou uma injeção de SQL que saísse do papel `authenticated` (reset
-- role) passava a ler e apagar tudo de uma vez, e até mudar o schema.
-- `flomo_app` não é dono de nada, não ignora o RLS, não faz DDL nem TRUNCATE
-- e, por conta própria, só alcança o catálogo, que é público. Dados de
-- usuário só com `set local role authenticated` e as claims de um usuário,
-- sob as policies. Limite: quem injetar SQL ainda pode se passar por um
-- usuário de cada vez (as claims vêm do app); o ganho é tirar o acesso total.
--
-- - Moderação de comentários: o gatilho de 0012 só aceita mudar a
--   moderação como `postgres`; quando houver moderação pelo servidor, ela
--   precisa de outro caminho.
--
-- - NOINHERIT: as permissões de `authenticated` só valem depois do
--   `set role`, não na conexão em si.
-- - Sem senha aqui (o repositório é público): quem administra o banco define
--   com `alter role flomo_app with password '...'` e troca a DATABASE_URL.
--   Até lá o app segue com a URL antiga, sem quebrar.
-- - Papéis valem para o servidor inteiro, por isso o `if not exists`.
-- - Tabela nova de catálogo precisa de GRANT e policy para `flomo_app` na
--   própria migration; tabela de usuário não recebe nada.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'flomo_app') then
    create role flomo_app login noinherit;
  end if;
end
$$;
--> statement-breakpoint
grant authenticated to flomo_app;
--> statement-breakpoint
grant usage on schema public, app to flomo_app;
--> statement-breakpoint
grant select, insert, update, delete on table
  public.titles, public.title_translations, public.external_ids, public.genres,
  public.title_genres, public.seasons, public.episodes, public.provider_payloads
  to flomo_app;
--> statement-breakpoint
grant execute on function app.title_rating_summary(uuid), app.title_episode_rating_summary(uuid) to flomo_app;
--> statement-breakpoint
CREATE POLICY "episodes_all_flomo_app" ON "episodes" AS PERMISSIVE FOR ALL TO "flomo_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "external_ids_all_flomo_app" ON "external_ids" AS PERMISSIVE FOR ALL TO "flomo_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "genres_all_flomo_app" ON "genres" AS PERMISSIVE FOR ALL TO "flomo_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "provider_payloads_all_flomo_app" ON "provider_payloads" AS PERMISSIVE FOR ALL TO "flomo_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "seasons_all_flomo_app" ON "seasons" AS PERMISSIVE FOR ALL TO "flomo_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "title_genres_all_flomo_app" ON "title_genres" AS PERMISSIVE FOR ALL TO "flomo_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "title_translations_all_flomo_app" ON "title_translations" AS PERMISSIVE FOR ALL TO "flomo_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "titles_all_flomo_app" ON "titles" AS PERMISSIVE FOR ALL TO "flomo_app" USING (true) WITH CHECK (true);
