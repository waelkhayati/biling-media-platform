import { StudioListPage, type StudioQuery } from "@/components/studio-list";

export default async function StudioShows({
  searchParams,
}: {
  searchParams: Promise<StudioQuery>;
}) {
  return <StudioListPage kind="shows" input={await searchParams} />;
}
