-- Solicitações de seguir pendentes (Fase 2.1). Só acrescenta uma função de
-- leitura nova; nada do que roda hoje muda.
--
-- Nome de exibição, handle e foto de quem pediu são sempre visíveis, qualquer
-- que seja a privacidade do perfil (decisão de 2026-11-09), mas a policy de
-- `profiles` esconde o perfil privado de outros usuários. Por isso a leitura
-- passa por esta função, que roda como dono da tabela e devolve só esses três
-- campos, e só das solicitações `requested` em que o usuário atual é o
-- seguido. Sem usuário logado, não devolve nada.
create function app.pending_follow_requests()
returns table (
  follower_id uuid,
  handle text,
  display_name text,
  avatar_url text,
  requested_at timestamp with time zone
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.handle,
    p.display_name,
    p.avatar_url,
    f.created_at
  from public.follows f
  join public.profiles p on p.id = f.follower_id
  where f.followee_id = app.current_user_id()
    and f.status = 'requested'
  order by f.created_at desc, f.follower_id
$$;
--> statement-breakpoint
revoke execute on function app.pending_follow_requests() from public;
--> statement-breakpoint
grant execute on function app.pending_follow_requests() to authenticated;
