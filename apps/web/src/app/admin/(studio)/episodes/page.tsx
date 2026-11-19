import { StudioListPage, type StudioQuery } from "@/components/studio-list";

export default async function StudioEpisodes({
  searchParams,
}: {
  searchParams: Promise<StudioQuery>;
}) {
  return <StudioListPage kind="episodes" input={await searchParams} />;
}
