-- Migration escrita à mão (Fase 1.5): `reviews` passa a se chamar `comments`,
-- o nome que o app usa. É só renomeação: dados, regras e permissões ficam como
-- estão (o drizzle-kit pediria para escolher entre renomear e criar tabela
-- nova, e isso não roda sem terminal).
alter table public.reviews rename to comments;
--> statement-breakpoint
alter table public.comments rename constraint reviews_pkey to comments_pkey;
--> statement-breakpoint
alter table public.comments rename constraint reviews_body to comments_body;
--> statement-breakpoint
alter table public.comments rename constraint reviews_moderation_status to comments_moderation_status;
--> statement-breakpoint
alter table public.comments rename constraint reviews_user_id_profiles_id_fk to comments_user_id_profiles_id_fk;
--> statement-breakpoint
alter table public.comments rename constraint reviews_title_id_titles_id_fk to comments_title_id_titles_id_fk;
--> statement-breakpoint
alter index public.reviews_user_title_created_idx rename to comments_user_title_created_idx;
--> statement-breakpoint
alter policy "reviews_all_own" on public.comments rename to "comments_all_own";
--> statement-breakpoint
alter trigger reviews_set_updated_at on public.comments rename to comments_set_updated_at;
--> statement-breakpoint
alter trigger reviews_guard_moderation on public.comments rename to comments_guard_moderation;
--> statement-breakpoint
-- A função muda de nome (os triggers a acompanham, e os privilégios ficam) e
-- a mensagem de erro passa a dizer "comentário". Mesma lógica da 0010.
alter function app.guard_review_moderation() rename to guard_comment_moderation;
--> statement-breakpoint
create or replace function app.guard_comment_moderation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'postgres' then
    if tg_op = 'INSERT' then
      new.moderation_status := 'published';
    elsif new.moderation_status is distinct from old.moderation_status then
      raise exception 'a situação de moderação do comentário não pode ser alterada pelo autor'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;
