import Link from "next/link";
import { notFound } from "next/navigation";
import type { StudioArticle } from "@biling/contracts";
import { staffContentIdSchema } from "@biling/schemas";
import { StudioArticleEditor, type ArticleOptions } from "@/components/studio-article-editor";
import { readStudio, requireStudioAccount } from "@/lib/studio-api";

export default async function EditArticle({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const account = await requireStudioAccount();
  const { id } = await params;
  if (!staffContentIdSchema.safeParse(id).success) notFound();
  const [article, options, query] = await Promise.all([
    id === "new" ? null : readStudio<StudioArticle>("/articles/" + id),
    readStudio<ArticleOptions>("/article-options"),
    searchParams,
  ]);
  return (
    <>
      <Link href="/admin/articles">Back to articles</Link>
      <header className="studio-heading">
        <h1>{article?.title ?? "Write an article"}</h1>
      </header>
      {query.saved === "1" && (
        <p className="studio-notice" role="status">
          Article saved.
        </p>
      )}
      <StudioArticleEditor
        key={article?.updatedAt}
        article={article}
        options={options}
        admin={account.role === "ADMIN"}
      />
    </>
  );
}
