import { describe, expect, it, vi } from "vitest";
import { CatalogUnavailableError } from "./ports";
import { fakeDeps, NOW, watchProviders } from "./test-fakes";
import { getTitleByRef } from "./titles";
import { getWatchProviders } from "./watch-providers";

const DAY_MS = 24 * 60 * 60 * 1000;
const REF = { mediaType: "tv", externalId: "1399" };

async function savedTitle(deps: Parameters<typeof getTitleByRef>[0]) {
  const result = await getTitleByRef(deps, REF);
  if (!result.ok) throw new Error("título não gravado");
  return result.value.id;
}

describe("getWatchProviders", () => {
  it("valida o uuid", async () => {
    const { deps, provider } = fakeDeps();
    const result = await getWatchProviders(deps, { titleId: "x" });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "INVALID_INPUT" },
    });
    expect(provider.fetchWatchProviders).not.toHaveBeenCalled();
  });

  it("título desconhecido: TITLE_NOT_FOUND", async () => {
    const { deps } = fakeDeps();
    const result = await getWatchProviders(deps, {
      titleId: "00000000-0000-4000-8000-0000000000ff",
    });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "TITLE_NOT_FOUND" },
    });
  });

  it("busca no provedor para o Brasil e guarda por 1 dia", async () => {
    const { deps, provider, memory } = fakeDeps();
    const titleId = await savedTitle(deps);
    const result = await getWatchProviders(deps, { titleId });
    expect(result).toEqual({ ok: true, value: watchProviders() });
    expect(provider.fetchWatchProviders).toHaveBeenCalledWith(REF, "BR");
    expect(memory.providers.get("providers:BR:tv/1399")?.expiresAt).toEqual(
      new Date(NOW.getTime() + DAY_MS),
    );
  });

  it("cache válido: não chama o provedor", async () => {
    const { deps, provider } = fakeDeps();
    const titleId = await savedTitle(deps);
    await getWatchProviders(deps, { titleId });
    await getWatchProviders(deps, { titleId });
    expect(provider.fetchWatchProviders).toHaveBeenCalledTimes(1);
  });

  it("cache vencido: devolve o gravado e atualiza depois da resposta", async () => {
    const { deps, provider, memory, runBackground } = fakeDeps();
    const titleId = await savedTitle(deps);
    memory.providers.set("providers:BR:tv/1399", {
      value: watchProviders({ flatrate: [] }),
      expiresAt: new Date(NOW.getTime() - 1),
    });
    const result = await getWatchProviders(deps, { titleId });
    expect(result).toMatchObject({ ok: true, value: { flatrate: [] } });
    expect(provider.fetchWatchProviders).not.toHaveBeenCalled();
    await runBackground();
    expect(provider.fetchWatchProviders).toHaveBeenCalledTimes(1);
    expect(
      memory.providers.get("providers:BR:tv/1399")?.value.flatrate,
    ).toHaveLength(1);
  });

  it("provedor fora do ar e sem cache: CATALOG_UNAVAILABLE", async () => {
    const { deps } = fakeDeps({
      provider: {
        fetchWatchProviders: vi.fn(async () => {
          throw new CatalogUnavailableError("fora do ar");
        }),
      },
    });
    const titleId = await savedTitle(deps);
    const result = await getWatchProviders(deps, { titleId });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "CATALOG_UNAVAILABLE" },
    });
  });
});
