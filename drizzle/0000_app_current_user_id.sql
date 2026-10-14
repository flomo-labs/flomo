-- Migration escrita à mão (ADR-003, seção 2).
-- Schema `app` com as funções que as policies usam. Só app.current_user_id()
-- sabe de onde vem o usuário; trocar o provedor de autenticação muda esta
-- função, não as policies.
-- ESPECÍFICO DO SUPABASE: depende de auth.uid() e dos papéis anon/authenticated.

create schema if not exists app;
--> statement-breakpoint
-- As policies rodam com o papel de quem consulta, que precisa enxergar o schema.
grant usage on schema app to anon, authenticated;
--> statement-breakpoint
create or replace function app.current_user_id()
returns uuid
language sql
stable
set search_path = ''
as $$ select auth.uid() $$;
--> statement-breakpoint
revoke execute on function app.current_user_id() from public;
--> statement-breakpoint
grant execute on function app.current_user_id() to anon, authenticated;
