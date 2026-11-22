"use client";
import { useState, type FormEvent } from "react";
import { normalizeMotWord, type ArcadePuzzleInput } from "@biling/schemas";
import { saveArcadePuzzle } from "@/app/arcade-studio-actions";

export function StudioArcadeEditor({ draft }: { draft?: ArcadePuzzleInput }) {
  const [kind, setKind] = useState(draft?.definition.kind ?? "MOT");
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const previous = draft?.definition;
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setSaved(false);
    const form = new FormData(event.currentTarget);
    const get = (key: string) => String(form.get(key) ?? "").trim();
    const split = (value: string, separator: string) =>
      value
        .split(separator)
        .map((item) => item.trim())
        .filter(Boolean);
    const definition =
      kind === "MOT"
        ? {
            kind,
            language: "en",
            solution: normalizeMotWord(get("solution")),
            dictionary: split(get("dictionary"), "\n").map(normalizeMotWord),
            guesses: Number(get("guesses")),
          }
        : kind === "LINKS"
          ? {
              kind,
              mistakes: Number(get("mistakes")),
              groups: Array.from({ length: 4 }, (_, group) => ({
                title: get("group" + group),
                tiles: split(get("tiles" + group), "\n").map((label, tile) => ({
                  label,
                  id: "g" + group + "t" + tile,
                })),
              })),
            }
          : {
              kind,
              duration: Number(get("duration")),
              foldAccents: form.has("fold"),
              answers: split(get("answers"), "\n").map((line) => {
                const [label = "", ...aliases] = split(line, "|");
                return { label, aliases };
              }),
            };
    try {
      const result = await saveArcadePuzzle({
        slug: get("slug"),
        title: get("title"),
        description: get("description"),
        date: get("date"),
        published: form.has("publish"),
        definition,
      });
      setError(result.error);
      setSaved(Boolean(result.saved));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="studio-form" onSubmit={save}>
      <fieldset disabled={busy}>
        <label>
          Title
          <input name="title" required defaultValue={draft?.title} maxLength={200} />
        </label>
        <label>
          Slug
          <input name="slug" required readOnly={!!draft} defaultValue={draft?.slug} />
        </label>
        <label>
          Description
          <textarea name="description" required maxLength={200} defaultValue={draft?.description} />
        </label>
        <label>
          UTC puzzle date
          <input type="date" name="date" required readOnly={!!draft} defaultValue={draft?.date} />
        </label>
        <label>
          Format
          <select
            value={kind}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "MOT" || value === "LINKS" || value === "RECALL") setKind(value);
            }}
          >
            <option value="MOT">Mot · English and French word deduction</option>
            <option value="LINKS">Links · grouping</option>
            <option value="RECALL">Recall · Name Them All</option>
          </select>
        </label>
        {kind === "MOT" && (
          <>
            <label>
              Solution
              <input
                name="solution"
                required
                minLength={4}
                maxLength={7}
                defaultValue={previous?.kind === "MOT" ? previous.solution : ""}
              />
            </label>
            <label>
              Extra accepted words, including Tunisian Latin spellings (optional, one per line)
              <textarea
                name="dictionary"
                rows={10}
                defaultValue={previous?.kind === "MOT" ? previous.dictionary.join("\n") : ""}
              />
            </label>
            <label>
              Guess limit
              <input
                type="number"
                name="guesses"
                min={2}
                max={10}
                required
                defaultValue={previous?.kind === "MOT" ? previous.guesses : 6}
              />
            </label>
          </>
        )}
        {kind === "LINKS" && (
          <>
            <label>
              Mistake limit
              <input
                type="number"
                name="mistakes"
                min={1}
                max={8}
                required
                defaultValue={previous?.kind === "LINKS" ? previous.mistakes : 4}
              />
            </label>
            {Array.from({ length: 4 }, (_, index) => (
              <fieldset key={index}>
                <legend>Group {index + 1}</legend>
                <label>
                  Group title
                  <input
                    name={"group" + index}
                    required
                    defaultValue={previous?.kind === "LINKS" ? previous.groups[index]?.title : ""}
                  />
                </label>
                <label>
                  Four tiles · one per line
                  <textarea
                    name={"tiles" + index}
                    required
                    rows={4}
                    defaultValue={
                      previous?.kind === "LINKS"
                        ? previous.groups[index]?.tiles.map((item) => item.label).join("\n")
                        : ""
                    }
                  />
                </label>
              </fieldset>
            ))}
          </>
        )}
        {kind === "RECALL" && (
          <>
            <label>
              Duration in seconds
              <input
                type="number"
                name="duration"
                required
                min={10}
                max={900}
                defaultValue={previous?.kind === "RECALL" ? previous.duration : 60}
              />
            </label>
            <label className="studio-checkbox">
              <input
                type="checkbox"
                name="fold"
                defaultChecked={previous?.kind === "RECALL" ? previous.foldAccents : true}
              />{" "}
              Allow unaccented Latin spellings
            </label>
            <label>
              Answers · one per line. Separate aliases using |
              <textarea
                name="answers"
                rows={12}
                required
                defaultValue={
                  previous?.kind === "RECALL"
                    ? previous.answers
                        .map((answer) => [answer.label, ...answer.aliases].join(" | "))
                        .join("\n")
                    : ""
                }
              />
            </label>
          </>
        )}
        <label className="studio-checkbox">
          <input type="checkbox" name="publish" /> Publish for the selected UTC date
        </label>
      </fieldset>
      {error && <p role="alert">{error}</p>}
      {saved && <p role="status">Puzzle saved.</p>}
      <button className="studio-button" disabled={busy}>
        {busy ? "Saving…" : "Save puzzle"}
      </button>
    </form>
  );
}
