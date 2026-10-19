import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Camadas (ADR-001): domain/ é TypeScript puro.
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["next", "next/*"],
              message: "domain/ não pode importar next (ADR-001).",
            },
            {
              group: ["react", "react/*", "react-dom", "react-dom/*"],
              message: "domain/ não pode importar react (ADR-001).",
            },
            {
              group: [
                "@/infra/*",
                "@/app/*",
                "@/components/*",
                "@/lib/*",
                "**/infra/**",
                "**/app/**",
              ],
              message:
                "domain/ não pode depender de infra/, app/ ou da UI (ADR-001).",
            },
            {
              group: ["drizzle-orm", "drizzle-orm/*", "drizzle-kit"],
              message:
                "domain/ não pode importar o ORM; use uma porta (interface) e implemente em infra/ (ADR-001).",
            },
            {
              group: ["@supabase/*"],
              message:
                "domain/ não pode importar o Supabase; use uma porta e implemente em infra/ (ADR-001).",
            },
          ],
        },
      ],
    },
  },

  // Camadas (ADR-001): contracts/ só depende de zod.
  //
  // ATENÇÃO: esta regra é uma LISTA DE PERMITIDOS. Qualquer import novo em
  // src/contracts/ falha no lint até ser liberado aqui, de propósito.
  // contracts/ será extraído para um pacote compartilhado (web + Expo),
  // então só entra dependência que rode em Node, navegador e React Native.
  // Para liberar um pacote, depois de decidir em PR que ele pode ficar em
  // contracts/, acrescente um lookahead ao regex abaixo, por exemplo:
  //   (?!nome-do-pacote(/|$))
  // Não desative a regra com eslint-disable nem aumente o escopo dela.
  {
    files: ["src/contracts/**/*.{ts,tsx}"],
    ignores: ["src/contracts/**/*.{test,spec}.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              // Bloqueia tudo, exceto: zod, imports relativos e @/contracts/*
              regex: "^(?!zod(/|$))(?!\\.{1,2}(/|$))(?!@/contracts/).+",
              message:
                "contracts/ só pode importar zod, outros arquivos de contracts/ ou caminhos relativos (ADR-001). Para liberar outro pacote, edite o regex em eslint.config.mjs (veja o comentário acima).",
            },
            {
              // Imports relativos que escapam para outra camada
              group: ["**/domain/**", "**/infra/**", "**/app/**"],
              message:
                "contracts/ não pode importar de outras camadas (ADR-001).",
            },
          ],
        },
      ],
    },
  },

  // Injeção de SQL: valor nunca vai colado no texto do comando. O `sql`
  // do Drizzle manda os valores à parte; estas saídas colam texto cru.
  // Exceções: definições de schema (CHECKs com listas fixas do código) e
  // testes (nomes de papel e de tabela escritos no próprio teste). Se um
  // caso novo parecer precisar delas, use `sql` com parâmetros ou
  // `sql.identifier`; não desative a regra com eslint-disable.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/infra/db/schema/**",
      "src/**/*.{test,spec}.{ts,tsx}",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[object.name='sql'][property.name='raw']",
          message:
            "sql.raw cola texto cru no comando (risco de injeção de SQL). Use o template sql`...` com parâmetros.",
        },
        {
          selector: "CallExpression[callee.property.name='unsafe']",
          message:
            ".unsafe() do postgres.js executa texto cru (risco de injeção de SQL). Use o template sql`...` do Drizzle.",
        },
        {
          selector:
            "CallExpression[callee.property.name='execute'][arguments.0.type=/^(TemplateLiteral|BinaryExpression)$/]",
          message:
            "execute() com texto montado na mão é injeção de SQL esperando acontecer. Use o template sql`...` do Drizzle.",
        },
      ],
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;