import { createHealthResponse } from "../src/health/health-response";

describe("createHealthResponse", () => {
  it("returns an ok status and an ISO timestamp", () => {
    const response = createHealthResponse(new Date("2026-01-01T00:00:00.000Z"));

    expect(response).toEqual({
      status: "ok",
      timestamp: "2026-01-01T00:00:00.000Z",
    });
  });
});
