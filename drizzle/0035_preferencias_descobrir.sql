-- Preferências da tela Descobrir (Fase 2.10, #111). Só acrescenta: tabela nova,
-- vazia; nenhuma tela nem função lê ou grava nela ainda (#112). Sem linha, o
-- Descobrir segue com a ordem e a exibição padrão.
--
-- As partes abaixo do último CREATE POLICY foram escritas à mão.
CREATE TABLE "discover_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"order_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"hidden_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discover_preferences_order_size" CHECK (cardinality("discover_preferences"."order_ids") <= 50),
	CONSTRAINT "discover_preferences_hidden_size" CHECK (cardinality("discover_preferences"."hidden_ids") <= 50)
);
--> statement-breakpoint
ALTER TABLE "discover_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "discover_preferences" ADD CONSTRAINT "discover_preferences_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "discover_preferences_all_own" ON "discover_preferences" AS PERMISSIVE FOR ALL TO "authenticated" USING ("discover_preferences"."user_id" = (select app.current_user_id())) WITH CHECK ("discover_preferences"."user_id" = (select app.current_user_id()));
--> statement-breakpoint
-- updated_at mantido pelo banco, com a mesma função de profiles.
create trigger discover_preferences_set_updated_at
before update on public.discover_preferences
for each row execute function app.set_updated_at();
--> statement-breakpoint
-- Privilégios na mesma migration (sem TRUNCATE, TRIGGER e REFERENCES, como na
-- 0018): o dono lê, cria, altera e apaga a própria linha; a policy
-- `discover_preferences_all_own` limita às linhas dele. Anônimo não toca.
grant select, insert, update, delete on table public.discover_preferences to authenticated;
