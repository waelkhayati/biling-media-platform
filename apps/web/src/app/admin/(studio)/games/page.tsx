import Link from "next/link";
import { studioGameQuerySchema } from "@biling/schemas";
import { readStudio } from "@/lib/studio-api";

type List = { items: { id: string; title: string; slug: string; type: string; status: string; updatedAt: string; attemptCount: number }[]; page: number; hasMore: boolean };
export default async function StudioGames({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const incoming = await searchParams;
  const parsed = studioGameQuerySchema.safeParse({ ...incoming, status: incoming.status || undefined, type: incoming.type || undefined });
  const filters = parsed.success ? parsed.data : { page: 1 };
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status); if (filters.type) params.set("type", filters.type); if (filters.page) params.set("page", String(filters.page));
  const list = await readStudio<List>("/games?" + params);
  return <><header className="studio-heading"><h1>Games</h1><Link className="studio-button" href="/admin/games/new">Create game</Link></header><form className="studio-article-tools" action="/admin/games"><label>Status<select name="status" defaultValue={filters.status ?? ""}><option value="">All statuses</option><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></label><label>Format<select name="type" defaultValue={filters.type ?? ""}><option value="">All formats</option><option value="TRIVIA">Trivia</option><option value="PERSONALITY">Personality</option><option value="DAILY_CHALLENGE">Daily challenge</option></select></label><button>Filter</button><Link href="/admin/games">Clear</Link></form>{list.items.length ? <div className="studio-table-scroll"><table className="studio-table"><thead><tr><th>Title</th><th>Format</th><th>Status</th><th>Attempts</th><th>Updated</th></tr></thead><tbody>{list.items.map((game) => <tr key={game.id}><th scope="row"><Link href={`/admin/games/${game.id}`}>{game.title}</Link></th><td>{game.type.toLowerCase().replace("_", " ")}</td><td><span className="studio-status" data-status={game.status}>{game.status.toLowerCase()}</span></td><td className="tabular-nums">{game.attemptCount}</td><td><time dateTime={game.updatedAt}>{game.updatedAt.slice(0, 10)}</time></td></tr>)}</tbody></table></div> : <p className="studio-empty">No games match these filters.</p>}</>;
}
