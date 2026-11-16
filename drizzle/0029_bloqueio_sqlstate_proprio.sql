-- Recusa de vínculo por bloqueio com SQLSTATE próprio (#367).
--
-- Só redefine app.follows_set_status: a recusa por bloqueio vigente deixa de
-- usar 42501 (o mesmo código de policy ou grant negado) e passa a usar FL003,
-- na mesma série de FL001/FL002 (0025). Assim o repositório distingue o
-- bloqueio de um grant ou policy quebrado de `follows`, que continua 42501 e
-- deixa de ser lido como "perfil não encontrado".
--
-- A regra não muda: bloqueio nos dois sentidos recusa seguir e pedir. O resto
-- da função é igual a 0024; `create or replace` preserva os grants.
--
-- Compatibilidade: o código antigo trata 42501 como bloqueio, então depois
-- desta migration, com o código anterior, a recusa por bloqueio vira erro
-- inesperado. Aplicar junto do código que mapeia FL003.
--
-- Escrita à mão (o drizzle-kit não gera funções).
create or replace function app.follows_set_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if app.blocked_between(new.follower_id, new.followee_id) then
    raise exception 'follow refused: block between the profiles'
      using errcode = 'FL003';
  end if;
  new.status := case
    when exists (
      select 1 from public.profiles p
      where p.id = new.followee_id and p.is_private
    ) then 'requested'
    else 'accepted'
  end;
  return new;
end;
$$;
