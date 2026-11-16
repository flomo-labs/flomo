-- Paginação por cursor nas listas de seguidores e de seguindo (#361).
--
-- A rolagem infinita (#352) paginava por `offset`: se alguém seguia ou deixava
-- de seguir durante a rolagem, as posições deslocavam e alguém era pulado ou
-- repetido. Aqui entram duas novas versões das funções, que recebem o cursor
-- (data do vínculo + id da pessoa) do último item já entregue.
--
-- Aditiva: as funções com `p_offset` (0023, 0027) continuam como estão, para
-- o código em produção seguir funcionando até esta migration e o código novo
-- chegarem juntos; remover as antigas é um passo à parte.
--
-- Mesma ordem das antigas (vínculo mais recente primeiro; empate pelo id em
-- ordem crescente) e mesmas regras de visibilidade (0027). A chamada com 4
-- argumentos escolhe a versão nova sem ambiguidade (sem `default` nos
-- argumentos do cursor); cursor nulo (`p_after_at` e `p_after_id`) é a
-- primeira página. `cursor_at` devolve a data com microssegundos, que o
-- `timestamptz` guarda mas o `Date` do JS perderia, e é o que deve voltar em
-- `p_after_at`.
--
-- Escrita à mão (o drizzle-kit não gera funções).

-- app.followers_of (cursor): quem segue o perfil.
create function app.followers_of(
  p_profile_id uuid,
  p_limit integer,
  p_after_at timestamp with time zone,
  p_after_id uuid
)
returns table (
  profile_id uuid,
  handle text,
  display_name text,
  avatar_url text,
  followed_at timestamp with time zone,
  cursor_at text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id, p.handle, p.display_name, p.avatar_url, f.created_at,
    to_char(f.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
  from public.follows f
  join public.profiles p on p.id = f.follower_id
  where f.followee_id = p_profile_id
    and f.status = 'accepted'
    and app.follow_list_visible(p_profile_id)
    and not app.is_blocked_by(p.id)
    and (
      p_after_at is null
      or f.created_at < p_after_at
      or (f.created_at = p_after_at and f.follower_id > p_after_id)
    )
  order by f.created_at desc, f.follower_id
  limit least(greatest(coalesce(p_limit, 30), 1), 100)
$$;
--> statement-breakpoint
revoke execute on function app.followers_of(uuid, integer, timestamp with time zone, uuid) from public;
--> statement-breakpoint
grant execute on function app.followers_of(uuid, integer, timestamp with time zone, uuid) to authenticated;
--> statement-breakpoint
-- app.following_of (cursor): quem o perfil segue.
create function app.following_of(
  p_profile_id uuid,
  p_limit integer,
  p_after_at timestamp with time zone,
  p_after_id uuid
)
returns table (
  profile_id uuid,
  handle text,
  display_name text,
  avatar_url text,
  followed_at timestamp with time zone,
  cursor_at text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id, p.handle, p.display_name, p.avatar_url, f.created_at,
    to_char(f.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
  from public.follows f
  join public.profiles p on p.id = f.followee_id
  where f.follower_id = p_profile_id
    and f.status = 'accepted'
    and app.follow_list_visible(p_profile_id)
    and not app.is_blocked_by(p.id)
    and (
      p_after_at is null
      or f.created_at < p_after_at
      or (f.created_at = p_after_at and f.followee_id > p_after_id)
    )
  order by f.created_at desc, f.followee_id
  limit least(greatest(coalesce(p_limit, 30), 1), 100)
$$;
--> statement-breakpoint
revoke execute on function app.following_of(uuid, integer, timestamp with time zone, uuid) from public;
--> statement-breakpoint
grant execute on function app.following_of(uuid, integer, timestamp with time zone, uuid) to authenticated;
