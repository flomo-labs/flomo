import { LibraryPage, libraryMetadata } from "@/app/_library/library-page";

export const generateMetadata = libraryMetadata;

export default function BibliotecaPage() {
  return <LibraryPage type="all" />;
}
