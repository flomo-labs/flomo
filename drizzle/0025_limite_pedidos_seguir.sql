-- Limite de volume de pedidos de seguir (Fase 2.1, #295). Só acrescenta: duas
-- tabelas novas e um gatilho novo em `follows`; sem nenhuma linha em
-- `follow_limits`, só o cliente (`authenticated`) fica sem poder criar vínculo
-- (falha fechada), e é preciso gravar os valores em cada ambiente.
--
-- As partes abaixo do último CREATE INDEX foram escritas à mão.
CREATE TABLE "follow_attempts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"follower_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "follow_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "follow_limits" (
	"window_seconds" integer PRIMARY KEY NOT NULL,
	"max_count" integer NOT NULL,
	CONSTRAINT "follow_limits_window_positive" CHECK ("follow_limits"."window_seconds" > 0),
	CONSTRAINT "follow_limits_max_positive" CHECK ("follow_limits"."max_count" > 0)
);
--> statement-breakpoint
ALTER TABLE "follow_limits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "follow_attempts" ADD CONSTRAINT "follow_attempts_follower_id_profiles_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "follow_attempts_follower_created_idx" ON "follow_attempts" USING btree ("follower_id","created_at");
--> statement-breakpoint
-- Só o gatilho (security definer) lê e grava estas tabelas; o cliente não tem
-- privilégio nenhum nelas, nem policy.
revoke all on table public.follow_limits from authenticated, anon;
--> statement-breakpoint
revoke all on table public.follow_attempts from authenticated, anon;
--> statement-breakpoint
-- app.follows_rate_limit: antes de criar um vínculo de seguir, confere o limite
-- do usuário em cada janela de `follow_limits` e registra a tentativa.
--
-- - Só vale quando o papel da sessão é `authenticated` (o do cliente, via withUser); migrations, seeds e rotinas de
--   manutenção (papel administrativo) não são limitadas.
-- - Quem já segue (ou já pediu) o mesmo perfil não gasta limite: o duplo clique
--   e o ON CONFLICT DO NOTHING passam sem registro.
-- - Seguir, desfazer e seguir de novo conta cada criação, porque o registro em
--   `follow_attempts` não some com o `delete` do vínculo.
-- - A trava por usuário (advisory lock da transação) impede que dois pedidos
--   simultâneos passem juntos pelo limite.
-- - Sem nenhuma janela configurada: recusa (FL002). Acima do limite: recusa
--   (FL001). Os registros mais velhos que a maior janela são apagados aqui.
create function app.follows_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit record;
  v_longest integer;
begin
  if current_setting('role') <> 'authenticated' then
    return new;
  end if;
  if exists (
    select 1 from public.follows f
    where f.follower_id = new.follower_id and f.followee_id = new.followee_id
  ) then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.follower_id::text, 295));

  select max(window_seconds) into v_longest from public.follow_limits;
  if v_longest is null then
    raise exception 'follow limit is not configured'
      using errcode = 'FL002';
  end if;

  for v_limit in select window_seconds, max_count from public.follow_limits loop
    if (
      select count(*) from public.follow_attempts a
      where a.follower_id = new.follower_id
        and a.created_at > now() - make_interval(secs => v_limit.window_seconds)
    ) >= v_limit.max_count then
      raise exception 'follow rate limit exceeded'
        using errcode = 'FL001';
    end if;
  end loop;

  delete from public.follow_attempts a
  where a.follower_id = new.follower_id
    and a.created_at <= now() - make_interval(secs => v_longest);
  insert into public.follow_attempts (follower_id) values (new.follower_id);
  return new;
end;
$$;
--> statement-breakpoint
revoke execute on function app.follows_rate_limit() from public;
--> statement-breakpoint
-- O nome vem antes de follows_set_status, então o limite é conferido primeiro.
create trigger follows_rate_limit
before insert on public.follows
for each row execute function app.follows_rate_limit();
