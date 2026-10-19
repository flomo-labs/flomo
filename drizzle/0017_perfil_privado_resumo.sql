-- Resumo de perfil para a página /@handle (regra de 2026-10-18): qualquer
-- usuário logado vê nome, handle e foto de qualquer perfil, inclusive privado,
-- para poder pedir para seguir; bio (e os números, em app.profile_stats) só
-- para o dono e, se o perfil for público, para todos. Quando houver
-- seguidores (Fase 2.1), quem foi aceito entra em `can_see_details`.
--
-- A policy de profiles continua escondendo a linha do perfil privado: este
-- resumo é o único caminho até ele, e só devolve os campos acima.
create function app.profile_card(p_handle text)
returns table (
  id uuid,
  handle text,
  display_name text,
  avatar_url text,
  is_private boolean,
  bio text,
  can_see_details boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with viewer as (
    select app.current_user_id() as id
  ),
  found as (
    select p.id, p.handle, p.display_name, p.avatar_url, p.is_private, p.bio,
      (not p.is_private or p.id = v.id) as can_see
    from public.profiles p, viewer v
    where p.handle = p_handle
      and v.id is not null
  )
  select
    f.id,
    f.handle,
    f.display_name,
    f.avatar_url,
    f.is_private,
    case when f.can_see then f.bio end,
    f.can_see
  from found f
$$;
--> statement-breakpoint
revoke execute on function app.profile_card(text) from public;
--> statement-breakpoint
grant execute on function app.profile_card(text) to authenticated;
