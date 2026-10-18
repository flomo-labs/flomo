CREATE INDEX "ratings_title_idx" ON "ratings" USING btree ("title_id");
--> statement-breakpoint
-- Escrito à mão: média e contagem das notas de um título somando todos os
-- usuários, para a nota de série e de temporada (calculadas, nunca gravadas).
-- `ratings` só é legível pelo dono (RLS); esta função roda com o papel do
-- dono da tabela para somar tudo, e só devolve agregados, nunca uma nota nem
-- quem a deu. Uma linha por temporada com notas (`season_number` nulo = nota
-- de filme); a média da série sai dessas linhas, ponderada pela contagem.
-- Liberada também para quem não entrou, porque a página do título é pública.
create or replace function app.title_rating_summary(p_title_id uuid)
returns table (season_number integer, average numeric, ratings_count integer)
language sql
stable
security definer
set search_path = ''
as $$
  select s.season_number,
         round(avg(r.half_stars), 2),
         count(*)::integer
  from public.ratings r
  left join public.episodes e on e.id = r.episode_id
  left join public.seasons s on s.id = e.season_id
  where r.title_id = p_title_id
  group by s.season_number
$$;
--> statement-breakpoint
revoke execute on function app.title_rating_summary(uuid) from public;
--> statement-breakpoint
grant execute on function app.title_rating_summary(uuid) to anon, authenticated;