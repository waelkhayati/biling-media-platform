"use client";

import { useEffect, useRef, useState } from "react";
import { normalizeMotWord, type ArcadeAction, type ArcadeView } from "@biling/schemas";
import { arcadeCommand } from "@/app/arcade-actions";

const alphabet = "QWERTYUIOPASDFGHJKLZXCVBNM";
export function ArcadePlayer({ initial, signedIn }: { initial: ArcadeView; signedIn: boolean }) {
  const [view, setView] = useState(initial);
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [seconds, setSeconds] = useState<number>();
  const pending = useRef(false);
  const expiryAttempted = useRef(false);
  const { progress } = view;
  const inProgress = progress?.status === "IN_PROGRESS";
  const done = progress && !inProgress;
  const count = view.slots.filter((item) => item.found).length;

  async function send(action?: ArcadeAction) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const result = await arcadeCommand(view.slug, view.date, action);
      if (result.view) {
        setView(result.view);
        setInput("");
        setSelected([]);
      } else setError(result.error);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!view.deadline || !inProgress) return;
    const start = performance.now();
    const duration = Date.parse(view.deadline) - Date.parse(view.serverNow);
    const tick = () =>
      setSeconds(Math.max(0, Math.ceil((duration - (performance.now() - start)) / 1000)));
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [view, inProgress]);

  useEffect(() => {
    if (!inProgress || !view.deadline || expiryAttempted.current || busy || seconds !== 0) return;
    const timer = setTimeout(() => {
      expiryAttempted.current = true;
      void send({ type: "expire", revision: progress.revision });
    }, 600);
    return () => clearTimeout(timer);
  });

  function submit() {
    if (!progress || !input.trim() || (view.kind === "RECALL" && seconds === 0)) return;
    if (view.kind === "MOT" && input.length !== view.wordLength) return;
    void send({
      type: view.kind === "MOT" ? "word" : "recall",
      value: input,
      revision: progress.revision,
    });
  }

  return (
    <section className="arcade-play">
      {error && <p role="alert">{error}</p>}
      {!progress &&
        (signedIn ? (
          <button className="game-button" disabled={busy} onClick={() => send()}>
            Start puzzle
          </button>
        ) : (
          <a className="game-button" href="/login">
            Sign in to play
          </a>
        ))}
      {view.kind === "MOT" && (
        <>
          <div className="mot-board" aria-label="Word guesses">
            {Array.from({ length: view.limit }, (_, row) => (
              <div className="mot-row" key={row}>
                {Array.from({ length: view.wordLength ?? 0 }, (_, col) => {
                  const guess = progress?.words[row];
                  const char =
                    guess?.value[col] ??
                    (inProgress && row === progress.words.length ? input[col] : undefined);
                  const mark = guess?.cells[col];
                  return (
                    <span
                      key={col}
                      data-mark={mark}
                      aria-label={char ? char + (mark ? ", " + mark : "") : "Empty"}
                    >
                      {char ?? " "}
                      {mark && (
                        <small aria-hidden="true">
                          {mark === "exact" ? "✓" : mark === "present" ? "•" : "×"}
                        </small>
                      )}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
          {inProgress && (
            <div className="mot-keyboard" aria-label="Letter keyboard">
              {[...alphabet].map((letter) => (
                <button
                  type="button"
                  key={letter}
                  disabled={busy}
                  data-used={progress.words.some((row) => row.value.includes(letter))}
                  onClick={() =>
                    setInput((value) => (value + letter).slice(0, view.wordLength ?? 0))
                  }
                >
                  {letter}
                </button>
              ))}
              <button type="button" onClick={() => setInput(input.slice(0, -1))}>
                Delete
              </button>
            </div>
          )}
          {view.solution && (
            <p>
              Solution <strong>{view.solution}</strong>
            </p>
          )}
        </>
      )}
      {view.kind === "LINKS" && (
        <>
          <p>{Math.max(0, view.limit - (progress?.mistakes ?? 0))} mistakes remaining</p>
          {view.groups.map((group) => (
            <div className="links-group" key={group.tiles[0].id} data-solved={group.solved}>
              <strong>{group.title}</strong>
              <span>{group.tiles.map((tile) => tile.label).join(" · ")}</span>
            </div>
          ))}
          <div className="links-board">
            {view.tiles.map((tile) => (
              <button
                key={tile.id}
                disabled={!inProgress || busy}
                aria-pressed={selected.includes(tile.id)}
                onClick={() =>
                  setSelected((old) =>
                    old.includes(tile.id)
                      ? old.filter((id) => id !== tile.id)
                      : old.length < 4
                        ? [...old, tile.id]
                        : old,
                  )
                }
              >
                {tile.label}
              </button>
            ))}
          </div>
          {inProgress && (
            <button
              className="game-button"
              disabled={selected.length !== 4 || busy}
              onClick={() => send({ type: "group", value: selected, revision: progress.revision })}
            >
              Submit group
            </button>
          )}
        </>
      )}
      {view.kind === "RECALL" && (
        <>
          {inProgress && seconds !== undefined && (
            <strong className="recall-clock" role="timer">
              {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
            </strong>
          )}
          <progress aria-label="Answers found" max={view.slots.length} value={count} />
          <p>
            {count} of {view.slots.length} unlocked
          </p>
          <ol className="recall-board">
            {view.slots.map((slot, index) => (
              <li key={index} data-found={slot.found}>
                {slot.label ?? "Hidden answer"}
              </li>
            ))}
          </ol>
        </>
      )}
      {inProgress && view.kind !== "LINKS" && (
        <form
          className="arcade-actions"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label>
            {view.kind === "MOT" ? "Your word" : "Type an answer"}
            <input
              value={input}
              maxLength={view.wordLength ?? 200}
              onChange={(event) =>
                setInput(
                  view.kind === "MOT"
                    ? normalizeMotWord(event.target.value)
                        .replace(/[^A-Z]/g, "")
                        .slice(0, view.wordLength ?? 7)
                    : event.target.value,
                )
              }
            />
          </label>
          <button className="game-button" disabled={busy || !input.trim()}>
            Submit
          </button>
        </form>
      )}
      <p role="status">{progress?.feedback}</p>
      {error && inProgress && seconds === 0 && (
        <button
          className="game-button"
          onClick={() => send({ type: "expire", revision: progress.revision })}
        >
          Check result
        </button>
      )}
      {done && (
        <>
          <h2>
            {view.won
              ? "Puzzle cleared"
              : progress.status === "EXPIRED"
                ? "Time’s up"
                : "Round complete"}
          </h2>
          <button
            className="game-button"
            onClick={async () => {
              const text =
                view.title +
                " · " +
                view.date +
                " · " +
                (view.kind === "RECALL"
                  ? count + "/" + view.slots.length
                  : view.won
                    ? "Cleared"
                    : "Complete");
              try {
                if (navigator.share) await navigator.share({ text });
                else await navigator.clipboard.writeText(text);
              } catch {
                /* Dismissed. */
              }
            }}
          >
            Share result
          </button>
        </>
      )}
    </section>
  );
}
