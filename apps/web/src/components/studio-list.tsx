import Link from "next/link";
import type { StaffListQuery, StudioEpisode, StudioList, StudioShow } from "@biling/contracts";
import { staffListQuerySchema } from "@biling/schemas";
import { readStudio } from "@/lib/studio-api";
import { StudioPagination, StudioTable } from "./studio-table";

export type StudioShowOption = Pick<StudioShow, "id" | "title" | "status">;
export type StudioQuery = Record<string, string | string[] | undefined>;

function listQuery(input: StudioQuery, isEpisode: boolean): StaffListQuery | undefined {
  return staffListQuerySchema.safeParse({
    status: input.status || undefined,
    showId: isEpisode ? input.showId || undefined : undefined,
    page: input.page,
  }).data;
}

export async function StudioListPage({
  kind,
  input,
}: {
  kind: "shows" | "episodes";
  input: StudioQuery;
}) {
  const isEpisode = kind === "episodes";
  const pagePath = `/admin/${kind}`;
  const query = listQuery(input, isEpisode);
  const params = new URLSearchParams();
  if (query?.status) params.set("status", query.status);
  if (query?.showId) params.set("showId", query.showId);
  if (query?.page) params.set("page", String(query.page));
  const [list, options] = await Promise.all([
    query ? readStudio<StudioList<StudioShow | StudioEpisode>>(`/${kind}?${params}`) : undefined,
    isEpisode ? readStudio<StudioShowOption[]>("/show-options") : [],
  ]);
  const rows = list?.items.map((item) => ({
    ...item,
    kind: "showTitle" in item ? ("episode" as const) : ("show" as const),
    context:
      "showTitle" in item
        ? item.showTitle
        : `${item.episodeCount} ${item.episodeCount === 1 ? "episode" : "episodes"}`,
  }));

  return (
    <>
      <div className="studio-heading">
        <h1>{isEpisode ? "Episodes" : "Productions"}</h1>
        <Link
          className="studio-button"
          href={`${pagePath}/new${query?.showId ? `?showId=${encodeURIComponent(query.showId)}` : ""}`}
        >
          {isEpisode ? "New episode" : "New production"}
        </Link>
      </div>
      <form action={pagePath} className="studio-filters" method="get">
        <label>
          Status
          <select name="status" defaultValue={query?.status ?? ""}>
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </label>
        {isEpisode && (
          <label>
            Production
            <select name="showId" defaultValue={query?.showId ?? ""}>
              <option value="">All productions</option>
              {options.map((show) => (
                <option key={show.id} value={show.id}>
                  {show.title}
                </option>
              ))}
            </select>
          </label>
        )}
        <button className="studio-button" type="submit">
          Apply filters
        </button>
        <Link className="studio-button studio-button-outline" href={pagePath}>
          Clear
        </Link>
      </form>
      {!query || !list || !rows ? (
        <p className="studio-error" role="alert">
          These filters are invalid. Clear them and try again.
        </p>
      ) : (
        <>
          <StudioTable rows={rows} />
          <StudioPagination path={pagePath} query={query} list={list} />
        </>
      )}
    </>
  );
}
