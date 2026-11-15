-- Esconde do bloqueado quem o bloqueou nas listas e contagens de seguidores
-- (#350, lacuna deixada por 0024 e 0026). Só redefine três funções de leitura;
-- sem nenhuma linha em `blocks`, nada do que roda hoje muda.
--
-- followers_of, following_of e follow_counts são security definer e por isso
-- ignoram a policy `profiles_select_hide_blocker` (0026): o bloqueado ainda
-- via, na lista ou na contagem de uma terceira pessoa, quem o bloqueou. Agora
-- cada vínculo cujo outro lado bloqueou o usuário atual é descartado, com
-- app.is_blocked_by (0026). Quem bloqueou e terceiros seguem vendo tudo.
--
-- Escrita à mão (o drizzle-kit não gera funções). Os grants seguem os de 0023
-- e `create or replace` os preserva; os `revoke`/`grant` abaixo só reafirmam.

-- app.follow_counts: não conta quem bloqueou o usuário atual. Resto igual a 0024.
create or replace function app.follow_counts(p_profile_id uuid)
returns table (
  followers_count integer,
  following_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      select count(*)
      from public.follows f
      where f.followee_id = p.id and f.status = 'accepted'
        and not app.is_blocked_by(f.follower_id)
    )::integer,
    (
      select count(*)
      from public.follows f
      where f.follower_id = p.id and f.status = 'accepted'
        and not app.is_blocked_by(f.followee_id)
    )::integer
  from public.profiles p
  where p.id = p_profile_id
    and app.current_user_id() is not null
    and not app.blocked_between(app.current_user_id(), p.id)
$$;
--> statement-breakpoint
-- app.followers_of: não lista quem bloqueou o usuário atual. Resto igual a 0023.
create or replace function app.followers_of(
  p_profile_id uuid,
  p_limit integer default 30,
  p_offset integer default 0
)
returns table (
  profile_id uuid,
  handle text,
  display_name text,
  avatar_url text,
  followed_at timestamp with time zone
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.handle, p.display_name, p.avatar_url, f.created_at
  from public.follows f
  join public.profiles p on p.id = f.follower_id
  where f.followee_id = p_profile_id
    and f.status = 'accepted'
    and app.follow_list_visible(p_profile_id)
    and not app.is_blocked_by(p.id)
  order by f.created_at desc, f.follower_id
  limit least(greatest(coalesce(p_limit, 30), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0)
$$;
--> statement-breakpoint
-- app.following_of: não lista quem bloqueou o usuário atual. Resto igual a 0023.
create or replace function app.following_of(
  p_profile_id uuid,
  p_limit integer default 30,
  p_offset integer default 0
)
returns table (
  profile_id uuid,
  handle text,
  display_name text,
  avatar_url text,
  followed_at timestamp with time zone
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.handle, p.display_name, p.avatar_url, f.created_at
  from public.follows f
  join public.profiles p on p.id = f.followee_id
  where f.follower_id = p_profile_id
    and f.status = 'accepted'
    and app.follow_list_visible(p_profile_id)
    and not app.is_blocked_by(p.id)
  order by f.created_at desc, f.followee_id
  limit least(greatest(coalesce(p_limit, 30), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0)
$$;
--> statement-breakpoint
revoke execute on function app.follow_counts(uuid) from public;
--> statement-breakpoint
grant execute on function app.follow_counts(uuid) to authenticated;
--> statement-breakpoint
revoke execute on function app.followers_of(uuid, integer, integer) from public;
--> statement-breakpoint
grant execute on function app.followers_of(uuid, integer, integer) to authenticated;
--> statement-breakpoint
revoke execute on function app.following_of(uuid, integer, integer) from public;
--> statement-breakpoint
grant execute on function app.following_of(uuid, integer, integer) to authenticated;
