"use client";

import { useActionState } from "react";
import type { StaffRole, StudioGame } from "@biling/contracts";
import { saveStudioGame } from "@/app/admin/actions";

const sampleQuestions = JSON.stringify([{ prompt: "Your question", explanation: null, options: [{ text: "First answer", correct: true, outcomeKey: null }, { text: "Second answer", correct: false, outcomeKey: null }] }], null, 2);
export function StudioGameEditor({ game, role }: { game?: StudioGame; role: StaffRole }) {
  const [state, action, pending] = useActionState(saveStudioGame.bind(null, game?.id ?? null), {});
  const readOnly = role === "EDITOR" && game?.status === "ARCHIVED";
  return <form className="studio-form" action={action}>{game && <input type="hidden" name="revision" value={game.updatedAt} />}<fieldset disabled={readOnly || pending}>
    <label>Title<input name="title" defaultValue={game?.title} required maxLength={160} /></label>
    <label>Slug<input name="slug" defaultValue={game?.slug} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" readOnly={!!game?.firstPublishedAt} /></label>
    <label>Description<textarea name="description" defaultValue={game?.description ?? ""} rows={4} maxLength={5000} /></label>
    <label>Artwork URL<input name="artworkUrl" type="url" defaultValue={game?.artworkUrl ?? ""} placeholder="https://" /></label>
    <label>Format<select name="type" defaultValue={game?.type ?? "TRIVIA"}><option value="TRIVIA">Trivia</option><option value="PERSONALITY">Personality quiz</option><option value="DAILY_CHALLENGE">Daily challenge</option></select></label>
    <label className="studio-checkbox"><input name="featured" type="checkbox" defaultChecked={game?.featured} /> Feature in Games Hub</label>
    <div className="studio-fields"><label>Available from (UTC)<input name="availableFrom" type="datetime-local" defaultValue={game?.availableFrom?.replace(/Z$/, "") ?? ""} /></label><label>Available until (UTC)<input name="availableUntil" type="datetime-local" defaultValue={game?.availableUntil?.replace(/Z$/, "") ?? ""} /></label></div>
    <label>Time limit in seconds (optional)<input name="timeLimitSeconds" type="number" min={5} max={3600} defaultValue={game?.timeLimitSeconds ?? ""} /></label>
    <label>Questions JSON<textarea name="questions" rows={16} defaultValue={game ? JSON.stringify(game.questions, null, 2) : sampleQuestions} required spellCheck={false} /><small>For trivia and daily questions, set exactly one <code>correct</code> answer. Personality options need an <code>outcomeKey</code>.</small></label>
    <label>Personality outcomes JSON<textarea name="outcomes" rows={10} defaultValue={JSON.stringify(game?.outcomes ?? [], null, 2)} required spellCheck={false} /><small>Use an empty array for trivia. Each outcome needs key, title, description, and optional imageUrl.</small></label>
    <label>Publication status<select name="status" defaultValue={game?.status ?? "DRAFT"}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option>{role === "ADMIN" && <option value="ARCHIVED">Archived</option>}</select></label>
  </fieldset>{state.error && <p className="studio-error" role="alert">{state.error}</p>}{!readOnly && <button className="studio-button" disabled={pending}>{pending ? "Saving..." : "Save game"}</button>}</form>;
}
