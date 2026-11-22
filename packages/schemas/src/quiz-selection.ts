export type QuizSelections = Readonly<Record<string, string>>;

export function selectQuizAnswer(
  selections: QuizSelections,
  questionId: string,
  optionId: string,
): QuizSelections {
  return { ...selections, [questionId]: optionId };
}

export function quizAnswers(
  selections: QuizSelections,
  questions: readonly { id: string; options: readonly { id: string }[] }[],
) {
  return questions.flatMap(({ id, options }) => {
    const optionId = selections[id];
    return options.some((option) => option.id === optionId) ? [{ questionId: id, optionId }] : [];
  });
}
