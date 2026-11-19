import Link from "next/link";
import type { StudioContentItem, StudioList } from "@biling/contracts";

const studioDate = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export function StudioTable({
  rows,
  empty = "No content matches these filters.",
}: {
  rows: (StudioContentItem & { kind: "show" | "episode"; context?: string })[];
  empty?: string;
}) {
  if (!rows.length) return <p className="studio-notice">{empty}</p>;
  return (
    <div className="studio-table-scroll" tabIndex={0} role="region" aria-label="Content table">
      <table className="studio-table">
        <thead>
          <tr>
            <th scope="col">Title</th>
            <th scope="col">Status</th>
            <th scope="col">Modified (UTC)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.kind}:${row.id}`}>
              <th scope="row">
                <Link
                  href={`/admin/${row.kind === "show" ? "shows" : "episodes"}/${encodeURIComponent(row.id)}`}
                  dir="auto"
                >
                  {row.title}
                </Link>
                <small>{row.context ?? (row.kind === "show" ? "Production" : "Episode")}</small>
              </th>
              <td>
                <span className="studio-status" data-status={row.status}>
                  {row.status.toLowerCase()}
                </span>
              </td>
              <td>
                <time dateTime={row.updatedAt}>{studioDate.format(new Date(row.updatedAt))}</time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StudioPagination({
  path,
  query,
  list,
}: {
  path: string;
  query: { status?: string; showId?: string; kind?: string };
  list: Pick<StudioList<unknown>, "page" | "hasMore">;
}) {
  if (list.page === 1 && !list.hasMore) return null;
  function href(page: number) {
    const params = new URLSearchParams({ page: String(page) });
    if (query.status) params.set("status", query.status);
    if (query.showId) params.set("showId", query.showId);
    if (query.kind) params.set("kind", query.kind);
    return `${path}?${params}`;
  }
  return (
    <nav className="studio-actions" aria-label="Content pages">
      {list.page > 1 && (
        <Link className="studio-button studio-button-outline" href={href(list.page - 1)}>
          Previous
        </Link>
      )}
      <span>Page {list.page}</span>
      {list.hasMore && (
        <Link className="studio-button studio-button-outline" href={href(list.page + 1)}>
          Next
        </Link>
      )}
    </nav>
  );
}
