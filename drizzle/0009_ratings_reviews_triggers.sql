-- Migration escrita à mão (Fase 1.5).

-- updated_at de ratings e reviews mantido pelo banco, com a mesma função de
-- profiles.
create trigger ratings_set_updated_at
before update on public.ratings
for each row execute function app.set_updated_at();
--> statement-breakpoint
create trigger reviews_set_updated_at
before update on public.reviews
for each row execute function app.set_updated_at();
--> statement-breakpoint
-- O autor não decide a situação de moderação da própria review: ao gravar
-- como `authenticated`, o insert nasce sempre `published` e o update não pode
-- trocá-la (senão quem teve a review ocultada a publicaria de novo). Só o
-- servidor (papel `postgres`) muda; moderadores entram aqui na Fase 2.8.
-- Trigger, e não grant por coluna, porque o insert do Drizzle lista todas as
-- colunas.
create or replace function app.guard_review_moderation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    if tg_op = 'INSERT' then
      new.moderation_status := 'published';
    elsif new.moderation_status is distinct from old.moderation_status then
      raise exception 'a situação de moderação da review não pode ser alterada pelo autor'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;
--> statement-breakpoint
revoke execute on function app.guard_review_moderation() from public;
--> statement-breakpoint
create trigger reviews_guard_moderation
before insert or update on public.reviews
for each row execute function app.guard_review_moderation();
