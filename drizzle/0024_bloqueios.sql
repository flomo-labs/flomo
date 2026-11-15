-- Bloqueio entre usuários (Fase 2.1). Só acrescenta: tabela nova, funções e
-- triggers novos e quatro funções de leitura recriadas com a mesma assinatura
-- (profile_card, profile_stats, follow_counts, follow_list_visible) e a função
-- de gatilho de `follows`; sem nenhuma linha em `blocks`, nada do que roda hoje
-- muda.
--
-- As partes abaixo do último CREATE POLICY foram escritas à mão.
CREATE TABLE "blocks" (
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blocks_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id"),
	CONSTRAINT "blocks_not_self" CHECK ("blocks"."blocker_id" <> "blocks"."blocked_id")
);
--> statement-breakpoint
ALTER TABLE "blocks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_profiles_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_profiles_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blocks_blocked_idx" ON "blocks" USING btree ("blocked_id");--> statement-breakpoint
CREATE POLICY "blocks_select_own" ON "blocks" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("blocks"."blocker_id" = (select app.current_user_id()));--> statement-breakpoint
CREATE POLICY "blocks_insert_as_blocker" ON "blocks" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("blocks"."blocker_id" = (select app.current_user_id()));--> statement-breakpoint
CREATE POLICY "blocks_delete_as_blocker" ON "blocks" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("blocks"."blocker_id" = (select app.current_user_id()));
--> statement-breakpoint
-- Sem UPDATE: bloqueio não muda, só se cria ou se desfaz (a ausência de policy
-- de update já barra; o revoke fecha também no privilégio).
revoke update on table public.blocks from authenticated;
--> statement-breakpoint
-- app.blocked_between: há bloqueio entre os dois usuários, em qualquer sentido?
-- Apoio das funções abaixo e do gatilho de `follows`; roda como dono da tabela
-- (a policy de `blocks` esconde do bloqueado que ele foi bloqueado) e fica sem
-- EXECUTE para o cliente.
create function app.blocked_between(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks b
    where (b.blocker_id = p_a and b.blocked_id = p_b)
       or (b.blocker_id = p_b and b.blocked_id = p_a)
  )
$$;
--> statement-breakpoint
revoke execute on function app.blocked_between(uuid, uuid) from public;
--> statement-breakpoint
-- Ao bloquear, o vínculo de seguir some nos dois sentidos (aceito ou
-- solicitação). Desbloquear não restaura nada. Função de gatilho não precisa
-- de EXECUTE.
create function app.blocks_remove_follows()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and followee_id = new.blocked_id)
     or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  return new;
end;
$$;
--> statement-breakpoint
revoke execute on function app.blocks_remove_follows() from public;
--> statement-breakpoint
create trigger blocks_remove_follows
after insert on public.blocks
for each row execute function app.blocks_remove_follows();
--> statement-breakpoint
-- app.follows_set_status: mesma regra de 0021, mais a recusa de novo vínculo
-- enquanto houver bloqueio entre os dois (nos dois sentidos: o bloqueado não
-- consegue seguir nem pedir, e quem bloqueou também não, até desbloquear).
-- A recusa usa o mesmo código de uma policy negada (42501).
create or replace function app.follows_set_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if app.blocked_between(new.follower_id, new.followee_id) then
    raise exception 'new row violates row-level security policy for table "follows"'
      using errcode = '42501';
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
--> statement-breakpoint
-- app.blocked_profiles: quem o usuário atual bloqueou, do bloqueio mais
-- recente para o mais antigo. Devolve só nome de exibição, handle e foto,
-- qualquer que seja a privacidade do perfil bloqueado (a policy de `profiles`
-- esconderia o perfil privado), para a pessoa poder desbloquear. Sem usuário
-- logado, não devolve nada.
create function app.blocked_profiles()
returns table (
  profile_id uuid,
  handle text,
  display_name text,
  avatar_url text,
  blocked_at timestamp with time zone
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.handle, p.display_name, p.avatar_url, b.created_at
  from public.blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = app.current_user_id()
  order by b.created_at desc, b.blocked_id
$$;
--> statement-breakpoint
revoke execute on function app.blocked_profiles() from public;
--> statement-breakpoint
grant execute on function app.blocked_profiles() to authenticated;
--> statement-breakpoint
-- app.profile_card: quem foi bloqueado não recebe linha do perfil de quem o
-- bloqueou (para ele o perfil não existe). Quem bloqueou continua recebendo
-- nome, handle, foto e `is_private` do bloqueado, mas sem bio e sem detalhes
-- (`can_see_details` falso), para poder desbloquear. Resto igual a 0021;
-- mesma assinatura.
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
        (
          not p.is_private
          or p.id = v.id
          or exists (
            select 1 from public.follows f
            where f.follower_id = v.id
              and f.followee_id = p.id
              and f.status = 'accepted'
          )
        )
        and not exists (
          select 1 from public.blocks b
          where b.blocker_id = v.id and b.blocked_id = p.id
        )
      ) as can_see
    from public.profiles p, viewer v
    where p.handle = p_handle
      and v.id is not null
      and not exists (
        select 1 from public.blocks b
        where b.blocker_id = p.id and b.blocked_id = v.id
      )
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
-- app.profile_stats: sem linha quando há bloqueio entre o usuário atual e o
-- perfil, em qualquer sentido. O resto da função é o de 0021.
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
      and not app.blocked_between(v.id, p.id)
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
-- app.follow_counts: sem linha quando há bloqueio entre o usuário atual e o
-- perfil, em qualquer sentido. Resto igual a 0023.
create or replace function app.follow_counts(p_profile_id uuid)
returns table (
  followers_count integer,
  following_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      select count(*)
      from public.follows f
      where f.followee_id = p.id and f.status = 'accepted'
    )::integer,
    (
      select count(*)
      from public.follows f
      where f.follower_id = p.id and f.status = 'accepted'
    )::integer
  from public.profiles p
  where p.id = p_profile_id
    and app.current_user_id() is not null
    and not app.blocked_between(app.current_user_id(), p.id)
$$;
--> statement-breakpoint
-- app.follow_list_visible: não vê as listas quando há bloqueio entre o usuário
-- atual e o perfil, em qualquer sentido (followers_of e following_of voltam
-- vazias). Resto igual a 0023.
create or replace function app.follow_list_visible(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    app.current_user_id() is not null
    and exists (
      select 1 from public.profiles p
      where p.id = p_profile_id
        and not app.blocked_between(app.current_user_id(), p.id)
        and (
          not p.is_private
          or p.id = app.current_user_id()
          or exists (
            select 1 from public.follows f
            where f.follower_id = app.current_user_id()
              and f.followee_id = p.id
              and f.status = 'accepted'
          )
        )
    )
$$;
