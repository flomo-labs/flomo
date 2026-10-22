import { LibraryPage, libraryMetadata } from "@/app/_library/library-page";

export const generateMetadata = libraryMetadata;

export default function BibliotecaSeriesPage() {
  return <LibraryPage type="tv" />;
}
