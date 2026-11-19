import Link from "next/link";
import type { StudioDashboard } from "@biling/contracts";
import { StudioTable } from "@/components/studio-table";
import { readStudio } from "@/lib/studio-api";

export default async function StudioDashboardPage() {
  const overview = await readStudio<StudioDashboard>("/dashboard");

  return (
    <>
      <div className="studio-heading">
        <h1>Overview</h1>
        <div className="studio-actions">
          <Link className="studio-button" href="/admin/shows/new">
            New production
          </Link>
          <Link className="studio-button studio-button-outline" href="/admin/episodes/new">
            New episode
          </Link>
        </div>
      </div>
      <div className="studio-totals">
        <section>
          <h2>Productions</h2>
          <dl>
            <div>
              <dt>Published</dt>
              <dd>{overview.shows.published}</dd>
            </div>
            <div>
              <dt>Drafts</dt>
              <dd>{overview.shows.draft}</dd>
            </div>
          </dl>
        </section>
        <section>
          <h2>Episodes</h2>
          <dl>
            <div>
              <dt>Published</dt>
              <dd>{overview.episodes.published}</dd>
            </div>
            <div>
              <dt>Drafts</dt>
              <dd>{overview.episodes.draft}</dd>
            </div>
          </dl>
        </section>
      </div>
      <section aria-labelledby="studio-recent">
        <h2 id="studio-recent">Recently modified</h2>
        <StudioTable
          rows={overview.recent}
          empty="Create a production to start building the catalogue."
        />
      </section>
    </>
  );
}
