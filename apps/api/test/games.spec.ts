import { ConflictException, ForbiddenException } from "@nestjs/common";
import { GameService } from "../src/games/game.service";

const prisma = { game: { findFirst: jest.fn(), findMany: jest.fn() }, gameAttempt: { create: jest.fn() }, dailyQuizProgress: { findUnique: jest.fn() } };
const trivia = {
  id: "game-1", slug: "trivia", type: "TRIVIA", outcomes: [],
  questions: [{ id: "q-1", position: 0, prompt: "Question", explanation: "Because.", options: [{ id: "wrong", text: "Wrong", correct: false, outcomeKey: null }, { id: "right", text: "Right", correct: true, outcomeKey: null }] }],
};

describe("GameService", () => {
  const service = new GameService(prisma as never);
  beforeEach(() => jest.resetAllMocks());

  it("scopes paginated text search to active published games and treats wildcards literally", async () => {
    prisma.game.findMany.mockResolvedValue([]);
    await expect(service.list({ page: 2, q: "100%" })).resolves.toMatchObject({ items: [], page: 2, hasMore: false });
    const pattern = { contains: "100\\%", mode: "insensitive" };
    expect(prisma.game.findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      skip: 12,
      take: 13,
      where: expect.objectContaining({ status: "PUBLISHED", AND: expect.any(Array), OR: [{ title: pattern }, { description: pattern }] }),
    }));
  });

  it("scores trivia on the server and only exposes answers after submission", async () => {
    prisma.game.findFirst.mockResolvedValue(trivia);
    const result = await service.attempt("trivia", { answers: [{ questionId: "q-1", optionId: "right" }], practice: false });
    expect(result.score).toBe(1);
    expect(result.answers).toEqual([{ questionId: "q-1", correctOptionId: "right", explanation: "Because." }]);
  });

  it("requires an account for an official daily attempt and prevents duplicate official scores", async () => {
    prisma.game.findFirst.mockResolvedValue({ ...trivia, type: "DAILY_CHALLENGE" });
    await expect(service.attempt("daily", { answers: [{ questionId: "q-1", optionId: "right" }], practice: false })).rejects.toBeInstanceOf(ForbiddenException);
    prisma.gameAttempt.create.mockRejectedValue({ code: "P2002" });
    await expect(service.attempt("daily", { answers: [{ questionId: "q-1", optionId: "right" }], practice: false }, "user-1")).rejects.toBeInstanceOf(ConflictException);
  });

  it("calculates personality outcomes from server-side option mappings", async () => {
    prisma.game.findFirst.mockResolvedValue({
      ...trivia, type: "PERSONALITY",
      outcomes: [{ key: "orange", title: "Orange energy", description: "Bold.", imageUrl: null }, { key: "lime", title: "Lime energy", description: "Fresh.", imageUrl: null }],
      questions: [{ ...trivia.questions[0], options: [{ id: "orange-option", text: "Orange", correct: false, outcomeKey: "orange" }, { id: "lime-option", text: "Lime", correct: false, outcomeKey: "lime" }] }],
    });
    const result = await service.attempt("vibe", { answers: [{ questionId: "q-1", optionId: "orange-option" }], practice: false });
    expect(result.outcome?.key).toBe("orange");
  });
});
