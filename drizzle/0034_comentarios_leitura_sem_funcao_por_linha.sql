-- Leitura de comentários sem chamar função a cada linha (#380).
--
-- A policy de 0032 chamava app.comment_author_visible por linha. Medido no
-- flomo-dev: ~0,27 ms por linha, o que chega a ~1,3 s quando os 5 mil comentários
-- mais recentes são de autores ocultos. Aqui a decisão passa a usar um conjunto
-- calculado uma vez por consulta: os autores ocultos de quem lê.
--
-- A regra de visibilidade é a mesma de 0032: o autor fica visível se é o próprio
-- usuário, tem perfil público, ou é privado e o usuário o segue com solicitação
-- aceita; fica oculto se bloqueou o usuário. Sem usuário logado: nada.
-- Só acrescenta uma função e troca a policy; app.comment_author_visible
-- continua existindo (app.comment_authors, 0033, a usa).
--
-- A função foi escrita à mão (o drizzle-kit só gera o resto).

-- app.comment_hidden_author_ids: ids de autores cujo conteúdo o usuário atual
-- não pode ver (bloqueadores e perfis privados sem follow aceito; nunca o
-- próprio usuário). Security definer porque as policies de `profiles`, `blocks`
-- e `follows` escondem linhas que a decisão precisa ver.
create function app.comment_hidden_author_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select b.blocker_id
  from public.blocks b
  where b.blocked_id = app.current_user_id()
  union
  select p.id
  from public.profiles p
  where p.is_private
    and p.id <> app.current_user_id()
    and not exists (
      select 1 from public.follows f
      where f.follower_id = app.current_user_id()
        and f.followee_id = p.id
        and f.status = 'accepted'
    )
$$;
--> statement-breakpoint
revoke execute on function app.comment_hidden_author_ids() from public;
--> statement-breakpoint
grant execute on function app.comment_hidden_author_ids() to authenticated;
--> statement-breakpoint
ALTER POLICY "comments_select_published_visible_author" ON "comments" TO authenticated USING ("comments"."moderation_status" = 'published' and app.current_user_id() is not null and "comments"."user_id" not in (select app.comment_hidden_author_ids()));