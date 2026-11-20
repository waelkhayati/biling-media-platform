import Link from "next/link";
import type { ModerationComment, StudioList } from "@biling/contracts";
import { ModerationControls } from "@/components/moderation-controls";
import { readStudio } from "@/lib/studio-api";

export const metadata = { title: "Community moderation" };
export default async function CommunityModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const raw = await searchParams;
  const status = ["OPEN", "REVIEWED", "DISMISSED"].includes(raw.status ?? "")
    ? raw.status
    : undefined;
  const page = /^\d+$/.test(raw.page ?? "") ? Math.max(1, Number(raw.page)) : 1;
  const params = new URLSearchParams({ page: String(page), ...(status && { status }) });
  const data = await readStudio<StudioList<ModerationComment>>(`/community/reports?${params}`);
  return (
    <>
      <div className="studio-title-row">
        <div>
          <span className="studio-kicker">Trust & safety</span>
          <h1>Community moderation</h1>
        </div>
      </div>
      <form className="studio-filters">
        <label>
          Report status
          <select name="status" defaultValue={status ?? ""}>
            <option value="">All reports</option>
            <option value="OPEN">Open</option>
            <option value="REVIEWED">Reviewed</option>
            <option value="DISMISSED">Dismissed</option>
          </select>
        </label>
        <button>Filter</button>
      </form>
      {data.items.length ? (
        <div className="moderation-list">
          {data.items.map((comment) => (
            <article className="moderation-card" key={comment.id}>
              <header>
                <strong>@{comment.author.username}</strong>
                <span>
                  {comment.status} · {new Date(comment.createdAt).toLocaleString()}
                </span>
              </header>
              <p>{comment.body}</p>
              <p className="studio-muted">
                Target: {comment.target.type} / {comment.target.slug}
              </p>
              <h2>Reports</h2>
              <ul>
                {comment.reports.map((report) => (
                  <li key={report.id}>
                    <strong>{report.reason}</strong> by @{report.reporter.username}
                    {report.details && <> — {report.details}</>} <small>{report.status}</small>
                  </li>
                ))}
              </ul>
              <ModerationControls id={comment.id} status={comment.status} />
              {comment.history.length > 0 && (
                <details>
                  <summary>Moderation history ({comment.history.length})</summary>
                  <ul>
                    {comment.history.map((event) => (
                      <li key={event.id}>
                        {event.action} by {event.actor} ·{" "}
                        {new Date(event.createdAt).toLocaleString()}
                        {event.note && <> — {event.note}</>}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="studio-empty">No reported comments match this filter.</p>
      )}
      <nav className="studio-pagination" aria-label="Moderation pages">
        {page > 1 && (
          <Link
            href={`?${new URLSearchParams({ ...(status && { status }), page: String(page - 1) })}`}
          >
            Previous
          </Link>
        )}
        {data.hasMore && (
          <Link
            href={`?${new URLSearchParams({ ...(status && { status }), page: String(page + 1) })}`}
          >
            Next
          </Link>
        )}
      </nav>
    </>
  );
}
