-- Migration escrita à mão (Fase 1.5, revisão do PR #36).

-- Lista de quem pode mudar a situação de moderação, em vez de lista de quem
-- não pode: só o servidor (`postgres`). Qualquer outro papel, inclusive um
-- que venha a existir, segue as regras do autor.
create or replace function app.guard_review_moderation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'postgres' then
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
-- updated_at da review = última edição do autor (texto ou aviso de spoiler);
-- ocultar ou remover pela moderação não conta como edição.
drop trigger reviews_set_updated_at on public.reviews;
--> statement-breakpoint
create trigger reviews_set_updated_at
before update of body, contains_spoilers on public.reviews
for each row execute function app.set_updated_at();
