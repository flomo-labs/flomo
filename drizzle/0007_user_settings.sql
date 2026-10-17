CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"start_screen" text DEFAULT 'home' NOT NULL,
	CONSTRAINT "user_settings_start_screen" CHECK ("user_settings"."start_screen" in ('home', 'following'))
);
--> statement-breakpoint
ALTER TABLE "user_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "user_settings_all_own" ON "user_settings" AS PERMISSIVE FOR ALL TO "authenticated" USING ("user_settings"."user_id" = (select app.current_user_id())) WITH CHECK ("user_settings"."user_id" = (select app.current_user_id()));