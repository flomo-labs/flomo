-- Corrige o mínimo da busca de pessoas (#357, achado na revisão do PR). Só
-- redefine app.search_people: o mínimo de 3 caracteres passa a valer também
-- para o termo do handle depois de tirar `.` e `_`; antes `a._` buscava todo
-- handle com "a". A busca por nome continua exigindo 3 caracteres do termo
-- inteiro. `create or replace` preserva os grants (0030).
--
-- Escrita à mão (o drizzle-kit não gera funções).
create or replace function app.search_people(
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
        when char_length(q2.h) >= 3 and x.hn = q2.h then 0
        when char_length(q2.h) >= 3 and x.hn like q2.h || '%' then 1
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
        (char_length(q2.h) >= 3 and x.hn like '%' || q2.h || '%')
        or x.fn like '%' || q2.t_esc || '%'
      )
  ) r
  where p_after_rank is null
    or (r.rank, r.handle) > (p_after_rank, p_after_handle)
  order by r.rank, r.handle
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
$$;
