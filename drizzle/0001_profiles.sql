CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"handle" text NOT NULL,
	"display_name" text,
	"bio" text,
	"avatar_url" text,
	"is_private" boolean DEFAULT false NOT NULL,
	"locale" text DEFAULT 'pt-BR' NOT NULL,
	"country" text DEFAULT 'BR' NOT NULL,
	"timezone" text DEFAULT 'America/Sao_Paulo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_handle_format" CHECK (char_length("profiles"."handle") between 5 and 20 and "profiles"."handle" ~ '^[a-z0-9]+([._][a-z0-9]+)*$')
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_handle_normalized_key" ON "profiles" USING btree (replace(replace("handle", '.', ''), '_', ''));--> statement-breakpoint
CREATE POLICY "profiles_select_public_or_own" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (not "profiles"."is_private" or "profiles"."id" = (select app.current_user_id()));--> statement-breakpoint
CREATE POLICY "profiles_update_own" ON "profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("profiles"."id" = (select app.current_user_id())) WITH CHECK ("profiles"."id" = (select app.current_user_id()));