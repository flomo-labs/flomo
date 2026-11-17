-- Busca de pessoas por handle e nome de exibição (#357). Só acrescenta: duas
-- funções novas; nenhuma tabela, policy ou função existente muda.
--
-- A policy de `profiles` esconde perfil privado de quem não é o dono, mas a
-- regra de visibilidade (docs/regras-de-negocio.md) deixa qualquer pessoa logada
-- ver nome, handle e foto de perfil privado para poder pedir para seguir. Por
-- isso a busca é uma função `security definer` que devolve só esses três campos.
--
-- Regras da busca (todas dentro da função, o cliente não as contorna):
-- - Só com usuário logado; sem login devolve vazio.
-- - Termo com menos de 3 caracteres (depois de tirar espaços e o `@` inicial)
--   devolve vazio.
-- - Maiúsculas, acentos e os separadores `.` e `_` do handle não contam.
-- - Fora do resultado: o próprio usuário, quem tem bloqueio com ele em qualquer
--   sentido (app.blocked_between) e perfis ainda com handle provisório (`u_`).
-- - Ordem: handle igual ao termo, handle começando com o termo, nome com uma
--   palavra começando com o termo, e o resto (termo em qualquer ponto); dentro
--   de cada grupo, por handle (único, então serve de desempate).
-- - Paginação por cursor (grupo, handle) do último item entregue; o tamanho da
--   página é limitado a 50.
--
-- Escrita à mão (o drizzle-kit não gera funções).

-- app.fold_text: minúsculas e sem acento (letras do português e vizinhas). Não
-- usa a extensão `unaccent`, que não está habilitada no banco.
create function app.fold_text(p_text text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select translate(
    lower(p_text),
    'áàâãäåéèêëíìîïóòôõöúùûüçñýÿ',
    'aaaaaaeeeeiiiiooooouuuucnyy'
  )
$$;
--> statement-breakpoint
revoke execute on function app.fold_text(text) from public;
--> statement-breakpoint
grant execute on function app.fold_text(text) to authenticated;
--> statement-breakpoint
create function app.search_people(
  p_query text,
  p_limit integer,
  p_after_rank integer,
  p_after_handle text
)
returns table (
  profile_id uuid,
  handle text,
  display_name text,
  avatar_url text,
  rank integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with q as (
    select
      t.t,
      -- Para o handle: sem `.` e `_`, e sem curingas do LIKE.
      replace(replace(replace(t.t, '.', ''), '_', ''), '\', '\\') as h,
      replace(replace(replace(t.t, '\', '\\'), '%', '\%'), '_', '\_') as t_esc
    from (
      select app.fold_text(btrim(regexp_replace(coalesce(p_query, ''), '^\s*@', ''))) as t
    ) t
  ),
  q2 as (
    select t, replace(h, '%', '\%') as h, t_esc from q
  )
  select r.id, r.handle, r.display_name, r.avatar_url, r.rank
  from (
    select
      p.id, p.handle, p.display_name, p.avatar_url,
      case
        when q2.h <> '' and x.hn = q2.h then 0
        when q2.h <> '' and x.hn like q2.h || '%' then 1
        when x.fn like q2.t_esc || '%' or x.fn like '% ' || q2.t_esc || '%' then 2
        else 3
      end as rank
    from public.profiles p
    cross join q2
    cross join lateral (
      select
        replace(replace(p.handle, '.', ''), '_', '') as hn,
        app.fold_text(coalesce(p.display_name, '')) as fn
    ) x
    where app.current_user_id() is not null
      and char_length(q2.t) >= 3
      and p.id <> app.current_user_id()
      and p.handle not like 'u\_%'
      and not app.blocked_between(app.current_user_id(), p.id)
      and (
        (q2.h <> '' and x.hn like '%' || q2.h || '%')
        or x.fn like '%' || q2.t_esc || '%'
      )
  ) r
  where p_after_rank is null
    or (r.rank, r.handle) > (p_after_rank, p_after_handle)
  order by r.rank, r.handle
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
$$;
--> statement-breakpoint
revoke execute on function app.search_people(text, integer, integer, text) from public;
--> statement-breakpoint
grant execute on function app.search_people(text, integer, integer, text) to authenticated;
