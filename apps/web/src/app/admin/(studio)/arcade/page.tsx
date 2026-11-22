import Link from "next/link";
import { arcadePuzzleInputSchema, type ArcadePuzzleInput } from "@biling/schemas";
import { requireStudioAccount, studioRequest } from "@/lib/studio-api";
import { StudioArcadeEditor } from "@/components/studio-arcade-editor";

export default async function StudioArcade({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; date?: string }>;
}) {
  await requireStudioAccount();
  const { slug, date } = await searchParams;
  const response = await studioRequest("/arcade");
  if (!response.ok) throw new Error("Could not load arcade content.");
  const raw: (ArcadePuzzleInput & { id: string })[] = await response.json();
  const items = raw.map(({ slug, title, description, date, published, definition }) =>
    arcadePuzzleInputSchema.parse({ slug, title, description, date, published, definition }),
  );
  const draft = items.find((item) => item.slug === slug && item.date === date);
  return (
    <section>
      <h1>Arcade puzzles</h1>
      <p>Schedule puzzles by UTC date. Published definitions are locked.</p>
      <ul>
        {items.map((item) => (
          <li key={item.slug + item.date}>
            {item.date} · {item.title} ·{" "}
            {item.published ? (
              <Link href={"/games/arcade/" + item.slug + "/" + item.date}>Public puzzle</Link>
            ) : (
              <Link href={"/admin/arcade?slug=" + item.slug + "&date=" + item.date}>
                Edit draft
              </Link>
            )}
          </li>
        ))}
      </ul>
      {draft?.published ? (
        <p>This puzzle is published.</p>
      ) : (
        <StudioArcadeEditor key={(draft?.slug ?? "new") + draft?.date} draft={draft} />
      )}
    </section>
  );
}
