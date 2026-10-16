-- Migration escrita à mão (Fase 1.3).

-- updated_at de user_titles mantido pelo banco, com a mesma função de profiles.
create trigger user_titles_set_updated_at
before update on public.user_titles
for each row execute function app.set_updated_at();
--> statement-breakpoint
-- title_id sempre igual ao título do episódio, qualquer que seja o valor
-- enviado: o progresso por série e o histórico nunca contradizem o catálogo.
-- Roda com o papel de quem grava; `authenticated` já lê seasons e episodes.
create or replace function app.set_title_from_episode()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.episode_id is not null then
    select s.title_id into new.title_id
    from public.episodes e
    join public.seasons s on s.id = e.season_id
    where e.id = new.episode_id;
  end if;
  return new;
end;
$$;
--> statement-breakpoint
revoke execute on function app.set_title_from_episode() from public;
--> statement-breakpoint
create trigger user_episode_progress_set_title
before insert or update of episode_id, title_id on public.user_episode_progress
for each row execute function app.set_title_from_episode();
--> statement-breakpoint
create trigger watch_events_set_title
before insert or update of episode_id, title_id on public.watch_events
for each row execute function app.set_title_from_episode();
