import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { StudioArticle } from "@biling/contracts";
import { staffContentIdSchema } from "@biling/schemas";
import { ArticleReading } from "@/components/editorial-articles";
import { readStudio, requireStudioAccount } from "@/lib/studio-api";

export const metadata: Metadata = {
  title: "Article preview",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function PreviewArticle({ params }: { params: Promise<{ id: string }> }) {
  await requireStudioAccount();
  const { id } = await params;
  if (!staffContentIdSchema.safeParse(id).success) notFound();
  const article = await readStudio<StudioArticle>("/articles/" + id);
  return (
    <>
      <p className="studio-notice">
        Staff preview · {article.status.toLowerCase()} ·{" "}
        <Link href={"/admin/articles/" + article.id}>Return to editor</Link>
      </p>
      <ArticleReading article={article} />
    </>
  );
}
