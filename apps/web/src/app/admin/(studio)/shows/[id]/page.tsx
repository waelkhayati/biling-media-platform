import Link from "next/link";
import type { StudioShow } from "@biling/contracts";
import { StudioEditor } from "@/components/studio-editor";
import { readStudio, requireStudioAccount } from "@/lib/studio-api";
import { showPath } from "@/lib/content-paths";

export default async function StudioShowPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const [{ id }, account, search] = await Promise.all([
    params,
    requireStudioAccount(),
    searchParams,
  ]);
  const show =
    id === "new" ? undefined : await readStudio<StudioShow>(`/shows/${encodeURIComponent(id)}`);
  const associated = show ? `showId=${encodeURIComponent(show.id)}` : null;

  return (
    <>
      <Link className="studio-back" href="/admin/shows">
        ← Productions
      </Link>
      <div className="studio-heading">
        <h1 dir="auto">{show ? show.title : "New production"}</h1>
        {show && (
          <div className="studio-actions">
            <Link
              className="studio-button studio-button-outline"
              href={`/admin/episodes?${associated}`}
            >
              Episodes ({show.episodeCount})
            </Link>
            <Link
              className="studio-button studio-button-outline"
              href={`/admin/episodes/new?${associated}`}
            >
              New episode
            </Link>
            {show.status === "PUBLISHED" && (
              <Link className="studio-button studio-button-outline" href={showPath(show.slug)}>
                View public page
              </Link>
            )}
          </div>
        )}
      </div>
      {search.saved === "1" && (
        <p className="studio-success" role="status">
          Production saved.
        </p>
      )}
      <StudioEditor key={show?.updatedAt ?? "new"} kind="shows" record={show} role={account.role} />
    </>
  );
}
