import type { SearchMedia } from "@/lib/search-url";

// Campos escondidos dos formulários de busca (cabeçalho e celular): levam a
// aba (`tipo=pessoas`) ou o filtro de tipo (`midia`) ativos, para que uma nova
// busca, inclusive sem JavaScript, não os perca. Pessoas não tem filtro.
export function SearchStateFields({
  people = false,
  media = "tudo",
}: {
  people?: boolean;
  media?: SearchMedia;
}) {
  if (people) return <input type="hidden" name="tipo" value="pessoas" />;
  if (media !== "tudo")
    return <input type="hidden" name="midia" value={media} />;
  return null;
}
