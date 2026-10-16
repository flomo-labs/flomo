-- Migration escrita à mão (Fase 1.3).
-- updated_at de user_titles mantido pelo banco, com a mesma função de profiles.
create trigger user_titles_set_updated_at
before update on public.user_titles
for each row execute function app.set_updated_at();
