"use client";

import { useActionState, useRef, useState } from "react";
import {
  quizAnswers,
  selectQuizAnswer,
  type DailyQuizProgress,
  type QuizSelections,
} from "@biling/schemas";
import type { GameDetail } from "@biling/contracts";
import { submitGameAttempt, syncDailyQuiz, type GamePlayState } from "@/app/game-actions";

const initial: GamePlayState = {};
const selections = (draft?: DailyQuizProgress) =>
  Object.fromEntries(
    (draft?.answers ?? []).map(({ questionId, optionId }) => [questionId, optionId]),
  );

export function GamePlayer({
  game,
  signedIn,
  progress,
}: {
  game: GameDetail;
  signedIn: boolean;
  progress?: DailyQuizProgress;
}) {
  const [answers, setAnswers] = useState<QuizSelections>(() =>
    progress?.completed ? {} : selections(progress),
  );
  const [index, setIndex] = useState(0);
  const [practice, setPractice] = useState(!signedIn || !!progress?.completed);
  const [completed, setCompleted] = useState(!!progress?.completed);
  const [saving, setSaving] = useState(false);
  const [syncError, setSyncError] = useState<string>();
  const busy = useRef(false);
  const [state, action, pending] = useActionState(submitGameAttempt.bind(null, game.slug), initial);
  const daily = game.type === "DAILY_CHALLENGE";
  const question = game.questions[index];
  const payload = quizAnswers(answers, game.questions);
  const last = index === game.questions.length - 1;

  async function sync(optionId?: string) {
    if (busy.current || pending) return;
    busy.current = true;
    setSaving(true);
    setSyncError(undefined);
    try {
      const result = await syncDailyQuiz(
        game.slug,
        optionId ? { questionId: question.id, optionId } : undefined,
      );
      if (!result.draft) {
        setSyncError(result.error);
        return;
      }
      setCompleted(result.draft.completed);
      setPractice(result.draft.completed);
      setAnswers(result.draft.completed ? {} : selections(result.draft));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  if (state.result) {
    const result = state.result;
    const score = result.outcome?.title ?? result.score + " / " + result.totalQuestions;
    return (
      <section className="game-results" data-format={game.type} aria-live="polite">
        <span>
          {result.outcome
            ? "Your studio role"
            : result.official
              ? "Daily score saved"
              : "Final score"}
        </span>
        <h2>{score}</h2>
        {result.outcome && <p>{result.outcome.description}</p>}
        <button
          className="game-button"
          type="button"
          onClick={async () => {
            const text = game.title + " · " + score;
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
        <a className="game-button" href={"/games/" + game.slug}>
          Play again
        </a>
      </section>
    );
  }
  if (!question) return <p>This game has no questions.</p>;
  return (
    <form
      className="game-play"
      data-format={game.type}
      action={action}
      onSubmit={(event) => {
        if (busy.current || !last || payload.length !== game.questions.length)
          event.preventDefault();
      }}
    >
      <input type="hidden" name="practice" value={daily && practice ? "true" : "false"} />
      {payload.map(({ questionId, optionId }) => (
        <input key={questionId} type="hidden" name="answer" value={questionId + ":" + optionId} />
      ))}
      <div className="game-progress">
        {game.type === "PERSONALITY" ? "Scene" : daily ? "Daily round" : "Round"} {index + 1} of{" "}
        {game.questions.length}
        <progress
          aria-label="Answers selected"
          max={game.questions.length}
          value={payload.length}
        />
      </div>
      <fieldset key={question.id} disabled={saving || pending}>
        <legend>
          <span>{String(index + 1).padStart(2, "0")}</span>
          {question.prompt}
        </legend>
        {question.options.map((option, offset) => (
          <label key={option.id} className="game-option">
            <input
              required
              type="radio"
              name={"question-" + question.id}
              value={option.id}
              checked={answers[question.id] === option.id}
              onChange={() =>
                daily && !practice
                  ? void sync(option.id)
                  : setAnswers((old) => selectQuizAnswer(old, question.id, option.id))
              }
            />
            {game.type === "TRIVIA" && (
              <strong aria-hidden="true">{String.fromCharCode(65 + offset)}</strong>
            )}
            {option.text}
          </label>
        ))}
      </fieldset>
      {daily && signedIn && !completed && (
        <label className="game-practice">
          <input
            type="checkbox"
            checked={practice}
            disabled={saving || pending}
            onChange={(event) => {
              setIndex(0);
              if (event.target.checked) {
                setPractice(true);
                setAnswers({});
                setSyncError(undefined);
              } else void sync();
            }}
          />{" "}
          Practice mode
        </label>
      )}
      {daily && !signedIn && (
        <p>Sign in to save your official daily score. You are playing in practice mode.</p>
      )}
      {completed && <p>Today's official attempt is complete. You are playing in practice mode.</p>}
      {(syncError || state.error) && (
        <p className="game-error" role="alert">
          {syncError ?? state.error}
        </p>
      )}
      {(syncError || state.error) && daily && signedIn && !practice && (
        <button type="button" className="game-button" disabled={saving} onClick={() => sync()}>
          Restore saved answers
        </button>
      )}
      <div className="arcade-actions">
        {index > 0 && (
          <button
            className="game-button"
            type="button"
            disabled={saving || pending}
            onClick={() => setIndex(index - 1)}
          >
            Back
          </button>
        )}
        {last ? (
          <button
            className="game-button"
            disabled={saving || pending || payload.length !== game.questions.length}
          >
            {pending ? "Scoring…" : "See results"}
          </button>
        ) : (
          <button
            className="game-button"
            type="button"
            disabled={saving || !answers[question.id]}
            onClick={() => setIndex(index + 1)}
          >
            Next
          </button>
        )}
      </div>
    </form>
  );
}
