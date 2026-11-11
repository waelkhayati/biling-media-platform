export interface HealthResponse {
  status: "ok";
  timestamp: string;
}

export function createHealthResponse(now: Date = new Date()): HealthResponse {
  return {
    status: "ok",
    timestamp: now.toISOString(),
  };
}
