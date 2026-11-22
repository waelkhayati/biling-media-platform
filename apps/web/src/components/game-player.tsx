"use client";

import { useActionState, useState } from "react";
import type { GameDetail } from "@biling/contracts";
import { submitGameAttempt, type GamePlayState } from "@/app/game-actions";

const initial: GamePlayState = {};
export function GamePlayer({ game, signedIn }: { game: GameDetail; signedIn: boolean }) {
  const [practice, setPractice] = useState(false);
  const [state, action, pending] = useActionState(submitGameAttempt.bind(null, game.slug), initial);
  if (state.result) {
    const result = state.result;
    return <section className="game-results" aria-live="polite"><span>Results / complete</span><h2>{result.outcome ? result.outcome.title : `${result.score} / ${result.totalQuestions}`}</h2>{result.outcome ? <p>{result.outcome.description}</p> : <p>You got {result.score} of {result.totalQuestions} right.</p>}{result.official && <p>Your official UTC daily score is saved.</p>}<a className="game-button" href={`/games/${game.slug}`}>Play again</a></section>;
  }
  return <form className="game-play" action={action}>
    <div className="game-progress">{game.questions.length} questions {game.timeLimitSeconds ? ` / ${game.timeLimitSeconds}s` : ""}</div>
    {game.questions.map((question, index) => <fieldset key={question.id}><legend><span>{String(index + 1).padStart(2, "0")}</span>{question.prompt}</legend>{question.options.map((option) => <label key={option.id} className="game-option"><input required type="radio" name="answer" value={`${question.id}:${option.id}`} />{option.text}</label>)}</fieldset>)}
    {game.type === "DAILY_CHALLENGE" && <label className="game-practice"><input type="checkbox" checked={practice} onChange={(event) => setPractice(event.target.checked)} name="practice" value="true" /> Practice mode (does not affect today’s official score)</label>}
    {game.type === "DAILY_CHALLENGE" && !signedIn && <p className="game-auth-note">Sign in to save an official daily score. You can still use practice mode.</p>}
    {state.error && <p className="game-error" role="alert">{state.error}</p>}
    <button className="game-button" disabled={pending}>{pending ? "Scoring..." : "See results"}</button>
  </form>;
}
