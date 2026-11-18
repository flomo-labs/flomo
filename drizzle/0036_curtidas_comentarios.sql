-- Curtidas nos comentários (#396). Só acrescenta: tabela nova, vazia, duas
-- funções novas e o GRANT da tabela (#98). Nenhuma tela lê ou grava nela ainda
-- (a tela vem em #397).
--
-- As funções e o GRANT foram escritos à mão (o drizzle-kit só gera o resto); a
-- função app.can_like_comment vem antes da policy que a usa.

CREATE TABLE "comment_likes" (
	"comment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comment_likes_comment_id_user_id_pk" PRIMARY KEY("comment_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "comment_likes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comment_likes_user_idx" ON "comment_likes" USING btree ("user_id");--> statement-breakpoint
-- app.can_like_comment: o usuário atual pode curtir este comentário? Só se está
-- logado, o comentário está publicado, o autor não está oculto a ele (perfil
-- privado sem follow aceito, ou autor que o bloqueou; ver
-- app.comment_hidden_author_ids, 0034) e ele não bloqueou o autor. O próprio
-- comentário vale (o autor nunca está no conjunto de ocultos). Security
-- definer porque as policies de `blocks` e `profiles` escondem linhas que a
-- decisão precisa ver; só devolve sim ou não.
create function app.can_like_comment(p_comment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.current_user_id() is not null
    and exists (
      select 1
      from public.comments c
      where c.id = p_comment_id
        and c.moderation_status = 'published'
        and not exists (
          select 1 from app.comment_hidden_author_ids() h(id)
          where h.id = c.user_id
        )
        and not exists (
          select 1 from public.blocks b
          where b.blocker_id = app.current_user_id()
            and b.blocked_id = c.user_id
        )
    )
$$;
--> statement-breakpoint
revoke execute on function app.can_like_comment(uuid) from public;
--> statement-breakpoint
grant execute on function app.can_like_comment(uuid) to authenticated;
--> statement-breakpoint
-- app.comment_like_summaries: contagem de curtidas e "eu curti" dos comentários
-- pedidos, só dos que o usuário atual pode ler (publicados e de autor não
-- oculto a ele, o próprio incluso); os demais não voltam. A contagem é total,
-- de todas as pessoas, mesmo as bloqueadas. Security definer porque a policy
-- de `comment_likes` só mostra as curtidas do próprio usuário.
create function app.comment_like_summaries(p_comment_ids uuid[])
returns table (comment_id uuid, like_count integer, liked_by_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    (select count(*)::integer from public.comment_likes l where l.comment_id = c.id),
    exists (
      select 1 from public.comment_likes l
      where l.comment_id = c.id and l.user_id = app.current_user_id()
    )
  from public.comments c
  where app.current_user_id() is not null
    and c.id = any (p_comment_ids)
    and c.moderation_status = 'published'
    and not exists (
      select 1 from app.comment_hidden_author_ids() h(id)
      where h.id = c.user_id
    )
$$;
--> statement-breakpoint
revoke execute on function app.comment_like_summaries(uuid[]) from public;
--> statement-breakpoint
grant execute on function app.comment_like_summaries(uuid[]) to authenticated;
--> statement-breakpoint
CREATE POLICY "comment_likes_select_own" ON "comment_likes" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("comment_likes"."user_id" = (select app.current_user_id()));--> statement-breakpoint
CREATE POLICY "comment_likes_insert_own_if_allowed" ON "comment_likes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("comment_likes"."user_id" = (select app.current_user_id()) and app.can_like_comment("comment_likes"."comment_id"));--> statement-breakpoint
CREATE POLICY "comment_likes_delete_own" ON "comment_likes" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("comment_likes"."user_id" = (select app.current_user_id()));
--> statement-breakpoint
-- Privilégios na mesma migration (sem UPDATE, TRUNCATE, TRIGGER e REFERENCES):
-- a pessoa lê, cria e apaga as próprias curtidas; as policies limitam às linhas
-- dela. Anônimo não toca.
grant select, insert, delete on table public.comment_likes to authenticated;
