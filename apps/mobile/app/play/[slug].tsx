import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Share, View } from "react-native";
import type { GameAttemptResult, GameDetail } from "@biling/contracts";
import { quizAnswers, selectQuizAnswer, type QuizSelections } from "@biling/schemas";
import { api } from "../../src/api";
import { gameType } from "../../src/cards";
import { useResource } from "../../src/resource";
import { useSession } from "../../src/session";
import {
  Action,
  Artwork,
  color,
  Copy,
  Heading,
  Label,
  Screen,
  Status,
  styles,
  Title,
} from "../../src/ui";

function Player({ game }: { game: GameDetail }) {
  const { token, ready } = useSession();
  const [answers, setAnswers] = useState<QuizSelections>({});
  const [index, setIndex] = useState<number>();
  const [practice, setPractice] = useState(false);
  const [result, setResult] = useState<GameAttemptResult>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const pending = useRef(false);
  const daily = game.type === "DAILY_CHALLENGE";
  const personality = game.type === "PERSONALITY";
  const question = index === undefined ? undefined : game.questions[index];
  const choice = question ? answers[question.id] : undefined;
  const submission = quizAnswers(answers, game.questions);

  function start(isPractice: boolean) {
    setPractice(isPractice);
    setAnswers({});
    setResult(undefined);
    setError(undefined);
    setIndex(0);
  }

  async function perform(operation: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await operation();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not update your attempt.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  async function sync(optionId?: string) {
    if (!token) {
      router.push("/profile");
      return;
    }
    await perform(async () => {
      const draft = await api.dailyQuiz(
        game.slug,
        token,
        optionId && question ? { questionId: question.id, optionId } : undefined,
      );
      if (draft.completed) {
        setIndex(undefined);
        setAnswers({});
        setError("Today's official attempt is complete. You can still practice.");
        return;
      }
      setPractice(false);
      setAnswers(
        Object.fromEntries(draft.answers.map(({ questionId, optionId }) => [questionId, optionId])),
      );
      if (index === undefined) setIndex(0);
    });
  }

  function advance() {
    if (index === undefined || !choice || pending.current) return;
    if (index + 1 < game.questions.length) {
      setIndex(index + 1);
      return;
    }
    if (submission.length !== game.questions.length) return;
    void perform(async () =>
      setResult(await api.attempt(game.slug, { answers: submission, practice }, token)),
    );
  }

  if (result)
    return (
      <Screen key="result">
        <Label>
          {personality
            ? "Your studio role"
            : daily
              ? result.official
                ? "Official daily result"
                : "Practice result"
              : "Final score"}
        </Label>
        <Title>{result.outcome?.title ?? result.score + " / " + result.totalQuestions}</Title>
        {result.outcome?.imageUrl && <Artwork uri={result.outcome.imageUrl} />}
        {result.outcome && <Copy>{result.outcome.description}</Copy>}
        <Action
          quiet
          label="Share result"
          onPress={() => {
            void Share.share({
              message:
                game.title +
                " · " +
                (result.outcome?.title ?? result.score + "/" + result.totalQuestions),
            }).catch(() => {});
          }}
        />
        {result.answers
          .filter((answer) => answer.explanation || answer.correctOptionId)
          .map((answer) => {
            const answered = game.questions.find((item) => item.id === answer.questionId);
            const correct = answered?.options.find(
              (option) => option.id === answer.correctOptionId,
            );
            return (
              <View key={answer.questionId} style={styles.panel}>
                <Heading>{answered?.prompt}</Heading>
                {correct && <Label>Answer · {correct.text}</Label>}
                {answer.explanation && <Copy>{answer.explanation}</Copy>}
              </View>
            );
          })}
        <Action label={daily ? "Practice again" : "Play again"} onPress={() => start(daily)} />
      </Screen>
    );

  if (!question || index === undefined)
    return (
      <Screen key="intro">
        {game.artworkUrl && <Artwork uri={game.artworkUrl} />}
        <Label>
          {gameType[game.type]} · {game.questionCount} questions
        </Label>
        <Title>{game.title}</Title>
        {game.description && <Copy>{game.description}</Copy>}
        {daily && (
          <Copy muted>One official attempt per UTC day. Practice is available to everyone.</Copy>
        )}
        <Status error={error} />
        {game.questions.length ? (
          <>
            <Action
              label={
                daily
                  ? token
                    ? "Start or resume official attempt"
                    : "Sign in for official play"
                  : "Start game"
              }
              disabled={!ready || busy}
              onPress={() => (daily ? sync() : start(false))}
            />
            {daily && <Action quiet label="Practice" disabled={busy} onPress={() => start(true)} />}
          </>
        ) : (
          <Copy muted>This game is currently unavailable.</Copy>
        )}
      </Screen>
    );

  const last = index === game.questions.length - 1;
  return (
    <Screen key={question.id}>
      <Label>
        {game.title}
        {practice ? " · Practice" : ""}
      </Label>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Answers selected"
        accessibilityValue={{ min: 0, max: game.questions.length, now: submission.length }}
        style={{ height: 5, backgroundColor: color.line }}
      >
        <View
          style={{
            height: 5,
            backgroundColor: daily ? color.lime : color.orange,
            width: `${(submission.length * 100) / game.questions.length}%`,
          }}
        />
      </View>
      <Copy muted>
        {personality ? "Scene" : daily ? "Daily round" : "Round"} {index + 1} of{" "}
        {game.questions.length}
      </Copy>
      <Title>{question.prompt}</Title>
      <View style={personality ? styles.panel : styles.stack}>
        {question.options.map((option, offset) => (
          <Action
            key={option.id}
            label={
              game.type === "TRIVIA"
                ? String.fromCharCode(65 + offset) + "   " + option.text
                : option.text
            }
            quiet={choice !== option.id}
            selected={choice === option.id}
            disabled={busy}
            onPress={() => {
              if (daily && !practice) void sync(option.id);
              else setAnswers((old) => selectQuizAnswer(old, question.id, option.id));
            }}
          />
        ))}
      </View>
      <Status error={error} />
      <Action
        disabled={!choice || busy || (last && submission.length !== game.questions.length)}
        label={busy ? "Saving…" : last ? "Submit answers" : "Next question"}
        onPress={advance}
      />
      {index > 0 && (
        <Action
          quiet
          disabled={busy}
          label="Previous question"
          onPress={() => setIndex(index - 1)}
        />
      )}
      {daily && error && !practice && (
        <>
          <Action quiet disabled={busy} label="Restore saved answers" onPress={() => sync()} />
          <Action
            quiet
            disabled={busy}
            label="Start practice instead"
            onPress={() => start(true)}
          />
        </>
      )}
    </Screen>
  );
}

export default function Game() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const view = useResource(slug, () => api.game(slug));
  if (view.data) return <Player key={view.data.id} game={view.data} />;
  return (
    <Screen>
      <Status loading={view.loading} error={view.error} retry={view.refresh} />
    </Screen>
  );
}
