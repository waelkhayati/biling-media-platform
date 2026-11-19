import Link from "next/link";
import { studioArticleQuerySchema } from "@biling/schemas";
import type { StudioArticle } from "@biling/contracts";
import { readStudio } from "@/lib/studio-api";

type Row = Pick<
  StudioArticle,
  "id" | "title" | "slug" | "category" | "author" | "status" | "updatedAt"
>;
type List = { items: Row[]; page: number; hasMore: boolean };

export default async function StudioArticles({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const incoming = await searchParams;
  const parsed = studioArticleQuerySchema.safeParse({
    ...incoming,
    category: incoming.category || undefined,
    author: incoming.author || undefined,
    status: incoming.status || undefined,
  });
  const filters = parsed.data;
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.category) params.set("category", filters.category);
  if (filters?.author) params.set("author", filters.author);
  if (filters?.page) params.set("page", String(filters.page));
  const list = await readStudio<List>("/articles?" + params);

  function pageHref(page: number) {
    const next = new URLSearchParams(params);
    next.set("page", String(page));
    return "/admin/articles?" + next;
  }

  return (
    <>
      <header className="studio-heading">
        <h1>Articles</h1>
        <Link className="studio-button" href="/admin/articles/new">
          Write an article
        </Link>
      </header>
      <form action="/admin/articles" className="studio-article-tools">
        <label>
          Status
          <select name="status" defaultValue={filters?.status ?? ""}>
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </label>
        <label>
          Category
          <input name="category" maxLength={80} defaultValue={filters?.category} />
        </label>
        <label>
          Author
          <input name="author" maxLength={80} defaultValue={filters?.author} />
        </label>
        <button type="submit">Filter</button>
        <Link href="/admin/articles">Clear filters</Link>
      </form>
      {!parsed.success && <p role="status">Invalid filters. Showing all articles.</p>}
      {list.items.length ? (
        <div className="studio-table-scroll">
          <table className="studio-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Author</th>
                <th>Status</th>
                <th>Last edited</th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((article) => (
                <tr key={article.id}>
                  <th scope="row">
                    <Link href={"/admin/articles/" + article.id}>{article.title}</Link>
                  </th>
                  <td>{article.category}</td>
                  <td>{article.author}</td>
                  <td>
                    <span className="studio-status" data-status={article.status}>
                      {article.status.toLowerCase()}
                    </span>
                  </td>
                  <td>
                    <time dateTime={article.updatedAt}>{article.updatedAt.slice(0, 10)}</time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="studio-empty">No articles match these filters.</p>
      )}
      {(list.page > 1 || list.hasMore) && (
        <nav className="studio-article-tools" aria-label="Article pages">
          {list.page > 1 && <Link href={pageHref(list.page - 1)}>Previous page</Link>}
          <span>Page {list.page}</span>
          {list.hasMore && list.page < 99999 && (
            <Link href={pageHref(list.page + 1)}>Next page</Link>
          )}
        </nav>
      )}
    </>
  );
}
