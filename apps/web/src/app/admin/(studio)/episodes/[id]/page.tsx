import Link from "next/link";
import type { StudioEpisode } from "@biling/contracts";
import { StudioEditor } from "@/components/studio-editor";
import type { StudioShowOption } from "@/components/studio-list";
import { readStudio, requireStudioAccount } from "@/lib/studio-api";

export default async function StudioEpisodePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; showId?: string }>;
}) {
  const [{ id }, account, search] = await Promise.all([
    params,
    requireStudioAccount(),
    searchParams,
  ]);
  const [episode, shows] = await Promise.all([
    id === "new" ? undefined : readStudio<StudioEpisode>(`/episodes/${encodeURIComponent(id)}`),
    readStudio<StudioShowOption[]>("/show-options"),
  ]);

  return (
    <>
      <Link className="studio-back" href="/admin/episodes">
        ← Episodes
      </Link>
      <div className="studio-heading">
        <h1 dir="auto">{episode ? episode.title : "New episode"}</h1>
        {episode && (
          <Link
            className="studio-button studio-button-outline"
            href={`/admin/shows/${encodeURIComponent(episode.showId)}`}
          >
            Edit production
          </Link>
        )}
      </div>
      {search.saved === "1" && (
        <p className="studio-success" role="status">
          Episode saved.
        </p>
      )}
      {shows.length ? (
        <StudioEditor
          key={episode?.updatedAt ?? "new"}
          kind="episodes"
          record={episode}
          role={account.role}
          shows={shows}
          initialShow={search.showId}
        />
      ) : (
        <p className="studio-notice">
          Create a <Link href="/admin/shows/new">production</Link> before adding an episode.
        </p>
      )}
    </>
  );
}
