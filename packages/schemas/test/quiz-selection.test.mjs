import assert from "node:assert/strict";
import test from "node:test";
import { quizAnswers, selectQuizAnswer } from "../src/quiz-selection.ts";

test("moving forward, returning, and changing one answer preserves the other questions", () => {
  const questions = [
    { id: "one", options: [{ id: "a" }, { id: "b" }] },
    { id: "two", options: [{ id: "c" }] },
  ];
  const first = selectQuizAnswer({}, "one", "a");
  const second = selectQuizAnswer(first, "two", "c");
  assert.equal(second.one, "a");
  const edited = selectQuizAnswer(second, "one", "b");
  assert.equal(second.one, "a");
  assert.deepEqual(quizAnswers(edited, questions), [
    { questionId: "one", optionId: "b" },
    { questionId: "two", optionId: "c" },
  ]);
});

test("an edited game cannot submit options that disappeared", () => {
  assert.deepEqual(
    quizAnswers({ one: "obsolete", removed: "x" }, [{ id: "one", options: [{ id: "new" }] }]),
    [],
  );
});
