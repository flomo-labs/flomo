-- Revisão de RLS da Fase 1.6: tira permissões que as policies não cobrem.
--
-- 1. TRUNCATE, TRIGGER e REFERENCES não passam pelo RLS: com eles, qualquer
--    papel da API apagaria uma tabela inteira ou criaria gatilho nela. O app
--    nunca usa nenhum dos três com `authenticated`.
-- 2. `anon` não precisa de tabela nenhuma: visitante só lê o catálogo pelo
--    servidor e as médias pelas funções app.title_*_rating_summary.
-- 3. Funções novas nascem sem EXECUTE para PUBLIC; cada migration concede só
--    a quem precisa (até aqui era um `revoke` à mão por função). Precisa ser
--    o padrão global do papel: o Postgres não tira, por schema, o que PUBLIC
--    recebe por padrão. Funções de gatilho não precisam de EXECUTE.
-- 4. Nota sem episódio só vale para filme (a regra estava só no domínio).
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;
--> statement-breakpoint
revoke all on all tables in schema public from anon;
--> statement-breakpoint
alter default privileges in schema public revoke truncate, trigger, references on tables from anon, authenticated;
--> statement-breakpoint
alter default privileges in schema public revoke all on tables from anon;
--> statement-breakpoint
alter default privileges revoke execute on functions from public;
--> statement-breakpoint
alter default privileges in schema public revoke execute on functions from anon, authenticated;
--> statement-breakpoint
create function app.ratings_movie_without_episode()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.episode_id is null and exists (
    select 1 from public.titles t
    where t.id = new.title_id and t.media_type <> 'movie'
  ) then
    raise exception 'Nota sem episódio só vale para filme.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
--> statement-breakpoint
create trigger ratings_title_kind
before insert or update of episode_id, title_id on public.ratings
for each row execute function app.ratings_movie_without_episode();
