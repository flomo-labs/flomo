-- Esconde do bloqueado a linha do perfil de quem o bloqueou na tabela `profiles`
-- (#317, lacuna deixada por 0024). Só acrescenta: uma função e uma policy
-- restritiva de leitura; sem nenhuma linha em `blocks`, nada do que roda hoje
-- muda.
--
-- A função abaixo foi escrita à mão (o drizzle-kit só gera a policy).

-- app.is_blocked_by: o usuário atual foi bloqueado por p_profile_id? Security
-- definer porque a policy de `blocks` esconde do bloqueado a linha do bloqueio.
-- Sem usuário logado devolve falso. Usa a chave primária (blocker_id,
-- blocked_id), um acesso por índice por linha avaliada.
create function app.is_blocked_by(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks b
    where b.blocker_id = p_profile_id
      and b.blocked_id = app.current_user_id()
  )
$$;
--> statement-breakpoint
revoke execute on function app.is_blocked_by(uuid) from public;
--> statement-breakpoint
grant execute on function app.is_blocked_by(uuid) to authenticated;
--> statement-breakpoint
-- Restritiva: soma-se (AND) a `profiles_select_public_or_own`. A linha do
-- próprio usuário nunca é escondida (ninguém bloqueia a si mesmo).
CREATE POLICY "profiles_select_hide_blocker" ON "profiles" AS RESTRICTIVE FOR SELECT TO "authenticated" USING (not app.is_blocked_by("profiles"."id"));
