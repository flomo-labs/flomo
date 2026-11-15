-- Contagens e listas de seguidores e de seguindo (Fase 2.1). Só acrescenta
-- três funções de leitura novas; nada do que roda hoje muda.
--
-- A policy `follows_select_own` só deixa seguidor e seguido enxergarem a
-- linha, então o cliente não conta os seguidores de outra pessoa. Por isso a
-- leitura passa por funções que rodam como dono da tabela. Todas exigem usuário
-- logado (sem ele, não devolvem nada) e só consideram vínculos `accepted`:
-- solicitação pendente nunca conta nem aparece.
--
-- Regra (decisão de 2026-11-10):
--   * a contagem é visível a qualquer usuário logado, inclusive para perfil
--     privado e para quem não segue;
--   * as listas de perfil público são visíveis a qualquer usuário logado; as de
--     perfil privado só ao dono e a quem o segue com solicitação aceita. Quem
--     não pode ver recebe zero linhas.
-- Nome de exibição, handle e foto de quem aparece na lista são sempre
-- visíveis, qualquer que seja a privacidade do perfil dele (como nas
-- solicitações pendentes, 0022).

-- app.follow_counts: quantos seguem o perfil e quantos ele segue. Não devolve
-- linha se o perfil não existe.
create function app.follow_counts(p_profile_id uuid)
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
    )::integer,
    (
      select count(*)
      from public.follows f
      where f.follower_id = p.id and f.status = 'accepted'
    )::integer
  from public.profiles p
  where p.id = p_profile_id
    and app.current_user_id() is not null
$$;
--> statement-breakpoint
revoke execute on function app.follow_counts(uuid) from public;
--> statement-breakpoint
grant execute on function app.follow_counts(uuid) to authenticated;
--> statement-breakpoint
-- app.follow_list_visible: o usuário atual pode ver as listas do perfil? Sim se
-- o perfil é público, se é o dono ou se o segue com solicitação aceita. Perfil
-- inexistente: não. Apoio das duas listas abaixo; fica sem EXECUTE para o cliente.
create function app.follow_list_visible(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    app.current_user_id() is not null
    and exists (
      select 1 from public.profiles p
      where p.id = p_profile_id
        and (
          not p.is_private
          or p.id = app.current_user_id()
          or exists (
            select 1 from public.follows f
            where f.follower_id = app.current_user_id()
              and f.followee_id = p.id
              and f.status = 'accepted'
          )
        )
    )
$$;
--> statement-breakpoint
revoke execute on function app.follow_list_visible(uuid) from public;
--> statement-breakpoint
-- app.followers_of: quem segue o perfil, do vínculo mais recente para o mais
-- antigo, em páginas (`p_limit` de 1 a 100; `p_offset` de 0 em diante).
create function app.followers_of(
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
  order by f.created_at desc, f.follower_id
  limit least(greatest(coalesce(p_limit, 30), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0)
$$;
--> statement-breakpoint
revoke execute on function app.followers_of(uuid, integer, integer) from public;
--> statement-breakpoint
grant execute on function app.followers_of(uuid, integer, integer) to authenticated;
--> statement-breakpoint
-- app.following_of: quem o perfil segue, mesma ordem e paginação.
create function app.following_of(
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
  order by f.created_at desc, f.followee_id
  limit least(greatest(coalesce(p_limit, 30), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0)
$$;
--> statement-breakpoint
revoke execute on function app.following_of(uuid, integer, integer) from public;
--> statement-breakpoint
grant execute on function app.following_of(uuid, integer, integer) to authenticated;
