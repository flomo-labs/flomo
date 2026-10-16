import { getTranslations } from "next-intl/server";
import { getWatchProviders } from "@/app/_catalog/gateway";
import { Poster } from "@/components/catalog/poster";
import type {
  WatchProvider,
  WatchProviders as WatchProvidersData,
} from "@/domain/catalog/types";

const GROUPS = ["flatrate", "free", "rent", "buy"] as const;

// "Onde assistir no Brasil". Os dados são do JustWatch (via TMDB): o crédito
// e o link para a página do título no TMDB são obrigatórios.
export async function WatchProviders({ titleId }: { titleId: string }) {
  const t = await getTranslations("Watch");
  const result = await getWatchProviders(titleId);

  return (
    <section className="flex flex-col gap-3" aria-labelledby="onde-assistir">
      <h2 id="onde-assistir" className="text-xl font-semibold">
        {t("title")}
      </h2>
      {!result.ok ? (
        <p className="text-muted-foreground">{t("unavailable")}</p>
      ) : (
        <Offers providers={result.value} />
      )}
      <p className="text-xs text-muted-foreground">
        {t("credit")}{" "}
        <a
          href="https://www.justwatch.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4"
        >
          JustWatch
        </a>
      </p>
    </section>
  );
}

async function Offers({ providers }: { providers: WatchProvidersData }) {
  const t = await getTranslations("Watch");
  const groups = GROUPS.filter((group) => providers[group].length > 0);

  return (
    <>
      {groups.length === 0 ? (
        <p className="text-muted-foreground">{t("none")}</p>
      ) : (
        groups.map((group) => (
          <div key={group} className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {t(group)}
            </h3>
            <ul className="flex flex-wrap gap-3">
              {providers[group].map((provider) => (
                <ProviderLogo key={provider.id} provider={provider} />
              ))}
            </ul>
          </div>
        ))
      )}
      {providers.link ? (
        <a
          href={providers.link}
          target="_blank"
          rel="noopener noreferrer"
          className="w-fit text-sm underline underline-offset-4"
        >
          {t("seeAll")}
        </a>
      ) : null}
    </>
  );
}

function ProviderLogo({ provider }: { provider: WatchProvider }) {
  return (
    <li className="flex w-14 flex-col items-center gap-1 text-center">
      <Poster
        path={provider.logoPath}
        size="w92"
        alt=""
        className="aspect-square w-12 rounded-xl"
      />
      <span className="text-[0.7rem] leading-tight text-muted-foreground">
        {provider.name}
      </span>
    </li>
  );
}
