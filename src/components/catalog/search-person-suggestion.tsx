import { profileInitials } from "@/app/_profile/initials";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Conteúdo de uma sugestão de usuário no menu da busca: foto (iniciais), nome
// e @usuário. A linha (`li`, clique e destaque) é do `SearchCombobox`.
export function SearchPersonSuggestion({
  handle,
  displayName,
}: {
  handle: string;
  displayName: string | null;
}) {
  return (
    <>
      <Avatar className="size-8 shrink-0 sm:size-10">
        <AvatarFallback>{profileInitials(displayName, handle)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="line-clamp-1 text-sm font-semibold break-words">
          {displayName ?? `@${handle}`}
        </div>
        {displayName ? (
          <div className="line-clamp-1 text-xs break-words text-muted-foreground">
            @{handle}
          </div>
        ) : null}
      </div>
    </>
  );
}
