-- Histórico de buscas recentes no servidor (#425). Só acrescenta: tabela nova,
-- vazia, um gatilho e duas funções novas, mais o GRANT da tabela (#98). Nenhuma
-- tela lê ou grava nela ainda (o front vem depois); sem linha, o histórico é
-- vazio.
--
-- Tudo abaixo do último CREATE POLICY foi escrito à mão (o drizzle-kit só gera
-- o que está acima).
CREATE TABLE "recent_searches" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "recent_searches_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"term" text,
	"media_type" text,
	"external_id" text,
	"title" text,
	"year" text,
	"poster_path" text,
	"profile_id" uuid,
	"dedupe_key" text GENERATED ALWAYS AS (case "kind" when 'query' then 'q:' || lower("term") when 'title' then 't:' || "media_type" || '-' || "external_id" else 'p:' || "profile_id"::text end) STORED,
	"used_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "recent_searches_shape" CHECK ((
        "recent_searches"."kind" = 'query'
          and "recent_searches"."term" is not null and "recent_searches"."media_type" is null and "recent_searches"."external_id" is null
          and "recent_searches"."title" is null and "recent_searches"."year" is null and "recent_searches"."poster_path" is null
          and "recent_searches"."profile_id" is null
      ) or (
        "recent_searches"."kind" = 'title'
          and "recent_searches"."term" is null and "recent_searches"."media_type" in ('movie', 'tv')
          and "recent_searches"."external_id" is not null and "recent_searches"."title" is not null
          and "recent_searches"."profile_id" is null
      ) or (
        "recent_searches"."kind" = 'person'
          and "recent_searches"."profile_id" is not null and "recent_searches"."profile_id" <> "recent_searches"."user_id"
          and "recent_searches"."term" is null and "recent_searches"."media_type" is null and "recent_searches"."external_id" is null
          and "recent_searches"."title" is null and "recent_searches"."year" is null and "recent_searches"."poster_path" is null
      )),
	CONSTRAINT "recent_searches_term_format" CHECK ("recent_searches"."term" is null or ("recent_searches"."term" = btrim("recent_searches"."term") and char_length("recent_searches"."term") between 1 and 100)),
	CONSTRAINT "recent_searches_title_format" CHECK ("recent_searches"."kind" <> 'title' or (
        "recent_searches"."external_id" ~ '^[1-9][0-9]{0,9}$'
        and char_length("recent_searches"."title") between 1 and 200
        and ("recent_searches"."year" is null or "recent_searches"."year" ~ '^[0-9]{4}$')
        and ("recent_searches"."poster_path" is null or "recent_searches"."poster_path" ~ '^/[A-Za-z0-9_-]{1,100}\.[A-Za-z0-9]{2,5}$')
      ))
);
--> statement-breakpoint
ALTER TABLE "recent_searches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "recent_searches" ADD CONSTRAINT "recent_searches_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recent_searches" ADD CONSTRAINT "recent_searches_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "recent_searches_user_key_idx" ON "recent_searches" USING btree ("user_id","dedupe_key");--> statement-breakpoint
CREATE INDEX "recent_searches_user_used_idx" ON "recent_searches" USING btree ("user_id","used_at");--> statement-breakpoint
CREATE POLICY "recent_searches_all_own" ON "recent_searches" AS PERMISSIVE FOR ALL TO "authenticated" USING ("recent_searches"."user_id" = (select app.current_user_id())) WITH CHECK ("recent_searches"."user_id" = (select app.current_user_id()));
--> statement-breakpoint
-- app.recent_searches_trim: depois de registrar (ou trazer ao topo) um item,
-- apaga o que passa dos 8 mais novos da pessoa. Roda com os direitos de quem
-- registrou (as linhas apagadas são dela, então a policy deixa). A trava por
-- usuário (advisory lock da transação) faz dois registros simultâneos
-- contarem um depois do outro, e o `delete` seguinte já enxerga o primeiro.
-- O 8 repete RECENT_SEARCHES_MAX em src/contracts/recent-search.ts: mudar um
-- exige mudar o outro (no banco, por uma migration nova).
create function app.recent_searches_trim()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 425));
  delete from public.recent_searches r
  where r.user_id = new.user_id
    and r.id in (
      select o.id from public.recent_searches o
      where o.user_id = new.user_id
      order by o.used_at desc, o.id desc
      offset 8
    );
  return null;
end;
$$;
--> statement-breakpoint
revoke execute on function app.recent_searches_trim() from public;
--> statement-breakpoint
create trigger recent_searches_trim
after insert or update of used_at on public.recent_searches
for each row execute function app.recent_searches_trim();
--> statement-breakpoint
-- app.find_recent_search_person: id do perfil que o usuário atual pode pôr no
-- histórico a partir do handle. Fica de fora (devolve nulo, sem dizer o
-- motivo): sem login, o próprio usuário, pessoa que não existe, handle
-- provisório (`u_`) e bloqueio entre os dois em qualquer sentido, como em
-- app.search_people (0030). Perfil privado vale: nome, handle e foto dele já
-- são visíveis a qualquer pessoa logada (docs/regras-de-negocio.md). Security
-- definer porque a policy de `profiles` esconde perfil privado e o bloqueador;
-- só devolve o id.
create function app.find_recent_search_person(p_handle text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.profiles p
  where app.current_user_id() is not null
    and p.handle = p_handle
    and p.id <> app.current_user_id()
    and p.handle not like 'u\_%'
    and not app.blocked_between(app.current_user_id(), p.id)
$$;
--> statement-breakpoint
revoke execute on function app.find_recent_search_person(text) from public;
--> statement-breakpoint
grant execute on function app.find_recent_search_person(text) to authenticated;
--> statement-breakpoint
-- app.delete_recent_search_person: apaga do histórico do usuário atual o item
-- da pessoa com este handle. Não usa os filtros de bloqueio: quem passou a
-- estar bloqueada some da lista (app.recent_searches), mas a linha continua e
-- precisa poder ser apagada. Security definer porque a policy de `profiles`
-- esconde perfil privado e o bloqueador; não devolve nada, então não revela se
-- o perfil existe. Só apaga linhas do próprio usuário.
create function app.delete_recent_search_person(p_handle text)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  delete from public.recent_searches r
  using public.profiles p
  where r.user_id = app.current_user_id()
    and r.kind = 'person'
    and p.id = r.profile_id
    and p.handle = p_handle
$$;
--> statement-breakpoint
revoke execute on function app.delete_recent_search_person(text) from public;
--> statement-breakpoint
grant execute on function app.delete_recent_search_person(text) to authenticated;
--> statement-breakpoint
-- app.recent_searches: o histórico do usuário atual, do mais novo para o mais
-- antigo, até 8. Item de pessoa só volta se ela ainda pode ser encontrada pelas
-- mesmas regras de app.find_recent_search_person: se passou a existir bloqueio
-- (em qualquer sentido) ou o handle voltou a ser provisório, o item some, sem
-- apagar a linha. Nome e handle vêm do perfil atual. Security definer pelo
-- mesmo motivo da função acima; só lê as linhas do próprio usuário. Sem login,
-- vazio.
create function app.recent_searches()
returns table (
  kind text,
  term text,
  media_type text,
  external_id text,
  title text,
  year text,
  poster_path text,
  handle text,
  display_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.kind, r.term, r.media_type, r.external_id, r.title, r.year,
    r.poster_path, p.handle, p.display_name
  from public.recent_searches r
  left join public.profiles p on p.id = r.profile_id
  where r.user_id = app.current_user_id()
    and (
      r.kind <> 'person'
      or (
        p.id is not null
        and p.handle not like 'u\_%'
        and not app.blocked_between(r.user_id, p.id)
      )
    )
  order by r.used_at desc, r.id desc
  limit 8
$$;
--> statement-breakpoint
revoke execute on function app.recent_searches() from public;
--> statement-breakpoint
grant execute on function app.recent_searches() to authenticated;
--> statement-breakpoint
-- Privilégios na mesma migration (sem TRUNCATE, TRIGGER e REFERENCES): a
-- pessoa lê, cria, altera (trazer ao topo) e apaga as próprias linhas; a policy
-- `recent_searches_all_own` limita às linhas dela. Anônimo não toca. O id é
-- identity: inserir não pede privilégio na sequência.
grant select, insert, update, delete on table public.recent_searches to authenticated;
