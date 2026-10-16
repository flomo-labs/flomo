-- Imitação mínima do Supabase para os testes de integração no CI, num
-- Postgres puro. NUNCA rodar no Supabase de verdade: lá tudo isto já existe.
-- Cobre só o que as migrations e os testes usam: os papéis anon,
-- authenticated e service_role, a tabela auth.users, a função auth.uid() e
-- os grants padrão que o Supabase dá no schema public. O banco real pode
-- divergir, por isso `pnpm test:integration` no flomo-dev continua valendo.

do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

-- O usuário das migrations e dos testes troca de papel com `set local role`.
grant anon, authenticated, service_role to current_user;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb,
  created_at timestamptz not null default now()
);

-- Mesma leitura do Supabase: o `sub` das claims do JWT da requisição.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
    ),
    ''
  )::uuid
$$;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- Grants padrão do Supabase no schema public; quem barra é o RLS.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;
