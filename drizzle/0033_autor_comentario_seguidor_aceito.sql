-- Nome e foto do autor de comentário para quem já pode ler o comentário (#382).
--
-- Só acrescenta uma função. A policy de `profiles` esconde a linha de perfil
-- privado até de quem o segue com solicitação aceita, então o autor vinha com
-- `author` nulo. Esta função devolve handle, nome e foto só dos autores que
-- `app.comment_author_visible` (0032) libera (próprio, público, ou privado
-- seguido com follow aceito; nunca quem bloqueou o usuário) e que têm ao menos
-- um comentário publicado. Quem não segue o autor privado não recebe nada.
--
-- A função foi escrita à mão (o drizzle-kit só gera o resto).

create function app.comment_authors(p_author_ids uuid[])
returns table (id uuid, handle text, display_name text, avatar_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.handle, p.display_name, p.avatar_url
  from public.profiles p
  where p.id = any (p_author_ids)
    and app.comment_author_visible(p.id)
    and exists (
      select 1 from public.comments c
      where c.user_id = p.id
        and c.moderation_status = 'published'
    )
$$;
--> statement-breakpoint
revoke execute on function app.comment_authors(uuid[]) from public;
--> statement-breakpoint
grant execute on function app.comment_authors(uuid[]) to authenticated;
