-- Escrito à mão: média e contagem das notas de cada episódio de um título,
-- somando todos os usuários. Mesma ideia da app.title_rating_summary (0013):
-- `ratings` só é legível pelo dono (RLS), então esta função roda com o papel
-- do dono da tabela para somar tudo e só devolve agregados, nunca uma nota nem
-- quem a deu. Uma linha por episódio que tem nota; a página do título lê todas
-- de uma vez. Liberada também para quem não entrou (a página é pública).
create or replace function app.title_episode_rating_summary(p_title_id uuid)
returns table (episode_id uuid, average numeric, ratings_count integer)
language sql
stable
security definer
set search_path = ''
as $$
  select r.episode_id,
         round(avg(r.half_stars), 2),
         count(*)::integer
  from public.ratings r
  where r.title_id = p_title_id
    and r.episode_id is not null
  group by r.episode_id
$$;
--> statement-breakpoint
revoke execute on function app.title_episode_rating_summary(uuid) from public;
--> statement-breakpoint
grant execute on function app.title_episode_rating_summary(uuid) to anon, authenticated;
