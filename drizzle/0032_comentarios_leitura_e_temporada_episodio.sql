-- Leitura de comentários de outras pessoas e comentário de temporada ou
-- episódio (#77, Fase 2.1b).
--
-- Só acrescenta: colunas opcionais, um índice, uma função, um trigger e uma
-- policy de leitura que se soma (OR) à do dono. Os comentários que existem
-- ficam como estão (do título).
--
-- As funções e o trigger foram escritos à mão (o drizzle-kit só gera o resto).

-- app.comment_author_visible: o usuário atual pode ver conteúdo deste autor?
-- Sim se o autor é o próprio usuário, tem perfil público, ou é privado e o
-- usuário o segue com solicitação aceita; não se o autor o bloqueou. Sem
-- usuário logado ou autor inexistente: não. Security definer porque a policy
-- de `follows` e a de `profiles` escondem linhas que a decisão precisa ver.
create function app.comment_author_visible(p_author_id uuid)
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
      where p.id = p_author_id
        and (
          p.id = app.current_user_id()
          or (
            not app.is_blocked_by(p.id)
            and (
              not p.is_private
              or exists (
                select 1 from public.follows f
                where f.follower_id = app.current_user_id()
                  and f.followee_id = p.id
                  and f.status = 'accepted'
              )
            )
          )
        )
    )
$$;
--> statement-breakpoint
revoke execute on function app.comment_author_visible(uuid) from public;
--> statement-breakpoint
grant execute on function app.comment_author_visible(uuid) to authenticated;
--> statement-breakpoint
-- title_id sempre igual ao título da temporada ou do episódio comentado, como
-- em app.set_title_from_episode (0005). Roda com o papel de quem grava;
-- `authenticated` já lê seasons e episodes.
create function app.comments_set_title()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_title_id uuid;
begin
  if new.episode_id is not null then
    select s.title_id into v_title_id
    from public.episodes e
    join public.seasons s on s.id = e.season_id
    where e.id = new.episode_id;
  elsif new.season_id is not null then
    select s.title_id into v_title_id
    from public.seasons s
    where s.id = new.season_id;
  end if;
  -- Se não achou (id inexistente), deixa o title_id como veio: quem recusa é a
  -- chave estrangeira, com o erro certo.
  if v_title_id is not null then
    new.title_id := v_title_id;
  end if;
  return new;
end;
$$;
--> statement-breakpoint
revoke execute on function app.comments_set_title() from public;
--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "season_id" uuid;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "episode_id" uuid;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comments_title_created_idx" ON "comments" USING btree ("title_id","created_at" DESC NULLS FIRST,"id" DESC NULLS FIRST);--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_season_or_episode" CHECK ("comments"."season_id" is null or "comments"."episode_id" is null);--> statement-breakpoint
CREATE POLICY "comments_select_published_visible_author" ON "comments" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("comments"."moderation_status" = 'published' and app.comment_author_visible("comments"."user_id"));
--> statement-breakpoint
create trigger comments_set_title
before insert or update of season_id, episode_id, title_id on public.comments
for each row execute function app.comments_set_title();
