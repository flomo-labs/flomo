import { randomUUID } from "node:crypto";
import type { BrowserContext } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";

// O app só oferece login com Google, que não dá para automatizar. O E2E cria
// um usuário por e-mail e senha direto no Supabase local (cadastro sem
// confirmação, só lá) e põe no navegador os mesmos cookies de sessão que o
// app gravaria, no formato do @supabase/ssr. Daí em diante tudo passa pelo
// app, como num login de verdade.
export async function signUpAndSignIn(context: BrowserContext) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY do Supabase local.",
    );
  }

  const jar = new Map<string, string>();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => {
        for (const { name, value } of cookies) jar.set(name, value);
      },
    },
  });

  const email = `e2e-${randomUUID()}@teste.flomo.invalid`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password: `Senha-${randomUUID()}`,
    options: { data: { full_name: "Pessoa do E2E" } },
  });
  if (error || !data.session) {
    throw new Error(`Cadastro no Supabase local falhou: ${error?.message}`);
  }

  await context.addCookies(
    [...jar].map(([name, value]) => ({
      name,
      value,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax" as const,
    })),
  );
  return { email, userId: data.user!.id };
}
