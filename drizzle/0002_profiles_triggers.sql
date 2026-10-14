-- Migration escrita à mão (ADR-003, seções 6 e 7).

-- updated_at mantido pelo banco em toda alteração.
create or replace function app.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
--> statement-breakpoint
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function app.set_updated_at();
--> statement-breakpoint
-- ESPECÍFICO DO SUPABASE: cria o perfil na mesma transação do cadastro em
-- auth.users, qualquer que seja a forma de login. Handle provisório `u_` +
-- 12 caracteres do id (aleatórios no uuid v4); o definitivo é escolhido no
-- primeiro acesso. Nome e foto vêm dos metadados do Google, quando existirem.
-- Um erro aqui impede o cadastro: há teste de integração.
create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, handle, display_name, avatar_url)
  values (
    new.id,
    'u_' || left(replace(new.id::text, '-', ''), 12),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
  return new;
end;
$$;
--> statement-breakpoint
-- Funções de trigger não são chamadas diretamente por ninguém.
revoke execute on function app.handle_new_user() from public;
--> statement-breakpoint
revoke execute on function app.set_updated_at() from public;
--> statement-breakpoint
create trigger on_auth_user_created
after insert on auth.users
for each row execute function app.handle_new_user();
