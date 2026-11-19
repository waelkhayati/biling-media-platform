import Link from "next/link";
import type { StudioAuditRow, StudioList } from "@biling/contracts";
import { staffAuditQuerySchema } from "@biling/schemas";
import { StudioPagination } from "@/components/studio-table";
import { readStudio, requireStudioAccount } from "@/lib/studio-api";

const date = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});
function label(value: string) {
  return value.toLowerCase().replaceAll("_", " ");
}

export default async function StudioAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; page?: string }>;
}) {
  const [raw, account] = await Promise.all([searchParams, requireStudioAccount()]);
  const filters = staffAuditQuerySchema.safeParse({ kind: raw.kind || undefined, page: raw.page });
  const query = filters.data;
  const allowed = query && (query.kind !== "STAFF" || account.role === "ADMIN");
  const params = new URLSearchParams({ page: String(query?.page ?? 1) });
  if (query?.kind) params.set("kind", query.kind);
  const result = allowed ? await readStudio<StudioList<StudioAuditRow>>(`/audit?${params}`) : null;
  return (
    <>
      <div className="studio-heading">
        <h1>Activity history</h1>
      </div>
      <form className="studio-filters" method="get" action="/admin/audit">
        <label>
          Activity
          <select name="kind" defaultValue={query?.kind ?? ""}>
            <option value="">All accessible activity</option>
            <option value="SHOW">Productions</option>
            <option value="EPISODE">Episodes</option>
            <option value="ARTICLE">Articles</option>
            {account.role === "ADMIN" && <option value="STAFF">Staff access</option>}
          </select>
        </label>
        <button className="studio-button" type="submit">
          Filter
        </button>
      </form>
      {!result ? (
        <p className="studio-error" role="alert">
          Choose an activity filter you can access.
        </p>
      ) : result.items.length ? (
        <div
          className="studio-table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Activity history"
        >
          <table className="studio-table">
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Action</th>
                <th scope="col">Actor</th>
                <th scope="col">Time (UTC)</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((row) => (
                <tr key={row.id}>
                  <th scope="row" dir="auto">
                    {row.resource === "STAFF" ? (
                      row.title
                    ) : (
                      <Link
                        href={`/admin/${row.resource === "ARTICLE" ? "articles" : row.resource === "SHOW" ? "shows" : "episodes"}/${encodeURIComponent(row.resourceId)}`}
                      >
                        {row.title}
                      </Link>
                    )}
                  </th>
                  <td>
                    {label(row.action)}
                    {row.previousStatus &&
                      row.nextStatus &&
                      row.previousStatus !== row.nextStatus && (
                        <small>
                          {label(row.previousStatus)} → {label(row.nextStatus)}
                        </small>
                      )}
                  </td>
                  <td>{row.actor}</td>
                  <td>
                    <time dateTime={row.createdAt}>{date.format(new Date(row.createdAt))}</time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="studio-notice">No activity matches this filter yet.</p>
      )}
      {result && (
        <StudioPagination path="/admin/audit" query={{ kind: query?.kind }} list={result} />
      )}
    </>
  );
}
