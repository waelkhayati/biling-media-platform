import Link from "next/link";
import type { StudioGame } from "@biling/contracts";
import { StudioGameEditor } from "@/components/studio-game-editor";
import { requireStudioAccount, readStudio } from "@/lib/studio-api";

export default async function StudioGamePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const [{ id }, { saved }, account] = await Promise.all([params, searchParams, requireStudioAccount()]);
  const game = id === "new" ? undefined : await readStudio<StudioGame>("/games/" + id);
  return <><header className="studio-heading"><div><Link href="/admin/games">Games</Link><h1>{game ? "Edit game" : "Create game"}</h1></div>{game?.status === "PUBLISHED" && <Link className="studio-button studio-button-outline" href={`/games/${game.slug}`}>Open public game</Link>}</header>{saved === "1" && <p className="studio-success" role="status">Game saved.</p>}<StudioGameEditor game={game} role={account.role} /></>;
}
