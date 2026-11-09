-- Seguidores (Fase 2.1). Só acrescenta: tabela nova, funções e triggers novos e
-- duas funções de leitura que passam a aceitar quem foi aceito; nada do que
-- roda hoje muda, porque ainda não há linha nenhuma em `follows`.
--
-- As partes abaixo do CREATE POLICY foram escritas à mão.
CREATE TABLE "follows" (
	"follower_id" uuid NOT NULL,
	"followee_id" uuid NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_follower_id_followee_id_pk" PRIMARY KEY("follower_id","followee_id"),
	CONSTRAINT "follows_status" CHECK ("follows"."status" in ('requested', 'accepted')),
	CONSTRAINT "follows_not_self" CHECK ("follows"."follower_id" <> "follows"."followee_id")
);
--> statement-breakpoint
ALTER TABLE "follows" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_profiles_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_followee_id_profiles_id_fk" FOREIGN KEY ("followee_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "follows_followee_status_idx" ON "follows" USING btree ("followee_id","status");--> statement-breakpoint
CREATE POLICY "follows_select_own" ON "follows" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("follows"."follower_id" = (select app.current_user_id()) or "follows"."followee_id" = (select app.current_user_id()));--> statement-breakpoint
CREATE POLICY "follows_insert_as_follower" ON "follows" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("follows"."follower_id" = (select app.current_user_id()));--> statement-breakpoint
CREATE POLICY "follows_accept_as_followee" ON "follows" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("follows"."followee_id" = (select app.current_user_id())) WITH CHECK ("follows"."followee_id" = (select app.current_user_id()) and "follows"."status" = 'accepted');--> statement-breakpoint
CREATE POLICY "follows_delete_either_side" ON "follows" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("follows"."follower_id" = (select app.current_user_id()) or "follows"."followee_id" = (select app.current_user_id()));
--> statement-breakpoint
-- Permissões por coluna: o Supabase concede tudo em tabela nova a
-- `authenticated`. Sem isso, o seguido aceito trocaria `follower_id` (e
-- forjaria um seguidor). Update: só `status` (o seguido aceita; a policy exige
-- `accepted`). Insert segue com todas as colunas, porque o Drizzle lista todas
-- (com DEFAULT) e o Postgres confere o privilégio de cada uma; o estado
-- escolhido pelo cliente é sobrescrito pelo trigger abaixo.
revoke update on table public.follows from authenticated;
--> statement-breakpoint
grant update (status) on table public.follows to authenticated;
--> statement-breakpoint
-- Estado de nascimento: perfil público é seguido direto (`accepted`), perfil
-- privado recebe uma solicitação (`requested`). Roda como dono da tabela
-- porque a policy de profiles esconde o perfil privado de quem pede.
-- Função de gatilho não precisa de EXECUTE.
create function app.follows_set_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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
--> statement-breakpoint
revoke execute on function app.follows_set_status() from public;
--> statement-breakpoint
create trigger follows_set_status
before insert on public.follows
for each row execute function app.follows_set_status();
--> statement-breakpoint
create trigger follows_set_updated_at
before update on public.follows
for each row execute function app.set_updated_at();
--> statement-breakpoint
-- Perfil privado que vira público: as solicitações pendentes são aceitas, como
-- no Instagram e no Letterboxd (decisão de 2026-11-09). O caminho contrário
-- (público vira privado) não mexe nos seguidores aceitos. Roda como dono da
-- tabela, sem depender das policies de `follows`.
create function app.follows_accept_pending_on_public()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.follows
  set status = 'accepted'
  where followee_id = new.id and status = 'requested';
  return new;
end;
$$;
--> statement-breakpoint
revoke execute on function app.follows_accept_pending_on_public() from public;
--> statement-breakpoint
create trigger profiles_accept_pending_follows
after update of is_private on public.profiles
for each row
when (old.is_private and not new.is_private)
execute function app.follows_accept_pending_on_public();
--> statement-breakpoint
-- app.profile_card: quem tem solicitação aceita vê o perfil completo (bio e
-- `can_see_details`), como se fosse público. Pendente não conta. Mesma
-- assinatura de 0017.
create or replace function app.profile_card(p_handle text)
returns table (
  id uuid,
  handle text,
  display_name text,
  avatar_url text,
  is_private boolean,
  bio text,
  can_see_details boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with viewer as (
    select app.current_user_id() as id
  ),
  found as (
    select p.id, p.handle, p.display_name, p.avatar_url, p.is_private, p.bio,
      (
        not p.is_private
        or p.id = v.id
        or exists (
          select 1 from public.follows f
          where f.follower_id = v.id
            and f.followee_id = p.id
            and f.status = 'accepted'
        )
      ) as can_see
    from public.profiles p, viewer v
    where p.handle = p_handle
      and v.id is not null
  )
  select
    f.id,
    f.handle,
    f.display_name,
    f.avatar_url,
    f.is_private,
    case when f.can_see then f.bio end,
    f.can_see
  from found f
$$;
--> statement-breakpoint
revoke execute on function app.profile_card(text) from public;
--> statement-breakpoint
grant execute on function app.profile_card(text) to authenticated;
--> statement-breakpoint
-- app.profile_stats: mesma regra de visibilidade do cartão. O resto da função
-- é o de 0016.
create or replace function app.profile_stats(p_profile_id uuid)
returns table (
  series_count integer,
  movies_count integer,
  episodes_count integer,
  minutes_watched bigint,
  ratings_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with viewer as (
    select app.current_user_id() as id
  ),
  allowed as (
    select p.id
    from public.profiles p, viewer v
    where p.id = p_profile_id
      and v.id is not null
      and (
        not p.is_private
        or p.id = v.id
        or exists (
          select 1 from public.follows f
          where f.follower_id = v.id
            and f.followee_id = p.id
            and f.status = 'accepted'
        )
      )
  ),
  episodes_seen as (
    select uep.title_id, coalesce(e.runtime, t.runtime, 0) as minutes
    from allowed a
    join public.user_episode_progress uep on uep.user_id = a.id
    join public.user_titles ut
      on ut.user_id = a.id and ut.title_id = uep.title_id and not ut.hidden
    join public.episodes e on e.id = uep.episode_id
    join public.titles t on t.id = uep.title_id
  ),
  movies_seen as (
    select distinct we.title_id, coalesce(t.runtime, 0) as minutes
    from allowed a
    join public.watch_events we on we.user_id = a.id and we.episode_id is null
    join public.user_titles ut
      on ut.user_id = a.id and ut.title_id = we.title_id and not ut.hidden
    join public.titles t on t.id = we.title_id and t.media_type = 'movie'
  )
  select
    (select count(distinct title_id) from episodes_seen)::integer,
    (select count(*) from movies_seen)::integer,
    (select count(*) from episodes_seen)::integer,
    ((select coalesce(sum(minutes), 0) from episodes_seen)
      + (select coalesce(sum(minutes), 0) from movies_seen))::bigint,
    (select count(*)
       from allowed a
       join public.ratings r on r.user_id = a.id
       join public.user_titles ut
         on ut.user_id = a.id and ut.title_id = r.title_id and not ut.hidden)::integer
  from allowed
$$;
--> statement-breakpoint
revoke execute on function app.profile_stats(uuid) from public;
--> statement-breakpoint
grant execute on function app.profile_stats(uuid) to authenticated;
