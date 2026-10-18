-- Escrito à mão antes dos CHECKs: nomes vindos do Google podem ter mais de 50
-- caracteres ou só espaços. Corta e limpa o que já existe para os CHECKs
-- entrarem sem falhar. Bio ainda não tinha tela, então só limpa o vazio.
update public.profiles
set display_name = nullif(left(btrim(display_name), 50), '')
where display_name is not null
  and (char_length(display_name) > 50 or display_name !~ '\S');
--> statement-breakpoint
update public.profiles
set bio = nullif(left(btrim(bio), 160), '')
where bio is not null
  and (char_length(bio) > 160 or bio !~ '\S');
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_display_name_length" CHECK ("profiles"."display_name" is null or (char_length("profiles"."display_name") between 1 and 50 and "profiles"."display_name" ~ '\S'));--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_bio_length" CHECK ("profiles"."bio" is null or (char_length("profiles"."bio") between 1 and 160 and "profiles"."bio" ~ '\S'));
--> statement-breakpoint
-- Escrito à mão: o trigger de cadastro (0002) passa a cortar o nome do Google
-- em 50 caracteres e a ignorar nome vazio, para o CHECK acima nunca impedir
-- um cadastro. O resto da função não muda.
create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, handle, display_name, avatar_url)
  values (
    new.id,
    'u_' || left(replace(new.id::text, '-', ''), 12),
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')), 50), ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
  return new;
end;
$$;
--> statement-breakpoint
revoke execute on function app.handle_new_user() from public;
--> statement-breakpoint
-- Escrito à mão: números do perfil (Fase 1.6). Biblioteca, progresso,
-- histórico e notas só são legíveis pelo dono (RLS); esta função roda com o
-- papel do dono das tabelas para contar, e só devolve totais, nunca qual
-- título nem qual nota. Responde só a quem entrou, e só para o próprio perfil
-- ou um perfil público; para perfil privado de outra pessoa, ou sem login,
-- não devolve linha nenhuma (decisão de 2026-10-18: perfil só para logados).
-- Só conta títulos que estão na biblioteca e não estão ocultos: um título
-- oculto ou tirado da biblioteca não aparece nem como número.
--   series_count: séries com pelo menos um episódio visto;
--   movies_count: filmes vistos (rever conta uma vez);
--   episodes_count: episódios vistos (rever conta uma vez);
--   minutes_watched: soma da duração dos episódios e filmes vistos, uma vez
--     cada; episódio sem duração usa a da série, e sem nenhuma conta zero;
--   ratings_count: notas dadas (filmes e episódios).
create or replace function app.profile_stats(p_profile_id uuid)
returns table (
  series_count integer,
  movies_count integer,
  episodes_count integer,
  minutes_watched bigint,
  ratings_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with viewer as (
    select app.current_user_id() as id
  ),
  allowed as (
    select p.id
    from public.profiles p, viewer v
    where p.id = p_profile_id
      and v.id is not null
      and (not p.is_private or p.id = v.id)
  ),
  episodes_seen as (
    select uep.title_id, coalesce(e.runtime, t.runtime, 0) as minutes
    from allowed a
    join public.user_episode_progress uep on uep.user_id = a.id
    join public.user_titles ut
      on ut.user_id = a.id and ut.title_id = uep.title_id and not ut.hidden
    join public.episodes e on e.id = uep.episode_id
    join public.titles t on t.id = uep.title_id
  ),
  movies_seen as (
    select distinct we.title_id, coalesce(t.runtime, 0) as minutes
    from allowed a
    join public.watch_events we on we.user_id = a.id and we.episode_id is null
    join public.user_titles ut
      on ut.user_id = a.id and ut.title_id = we.title_id and not ut.hidden
    join public.titles t on t.id = we.title_id and t.media_type = 'movie'
  )
  select
    (select count(distinct title_id) from episodes_seen)::integer,
    (select count(*) from movies_seen)::integer,
    (select count(*) from episodes_seen)::integer,
    ((select coalesce(sum(minutes), 0) from episodes_seen)
      + (select coalesce(sum(minutes), 0) from movies_seen))::bigint,
    (select count(*)
       from allowed a
       join public.ratings r on r.user_id = a.id
       join public.user_titles ut
         on ut.user_id = a.id and ut.title_id = r.title_id and not ut.hidden)::integer
  from allowed
$$;
--> statement-breakpoint
revoke execute on function app.profile_stats(uuid) from public;
--> statement-breakpoint
grant execute on function app.profile_stats(uuid) to authenticated;
