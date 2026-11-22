import { arcadeSummarySchema, arcadeViewSchema, type ArcadeAction } from "@biling/schemas";
import { request, segment } from "./api";

const path = (slug: string, date: string) => "/arcade/" + segment(slug) + "/" + segment(date);
export const arcadeApi = {
  list: (token?: string) => request("/arcade", { token }, arcadeSummarySchema.array()),
  read: (slug: string, date: string, token?: string) =>
    request(path(slug, date), { token }, arcadeViewSchema),
  start: (slug: string, date: string, token: string) =>
    request(path(slug, date) + "/start", { token, method: "POST" }, arcadeViewSchema),
  move: (slug: string, date: string, token: string, body: ArcadeAction) =>
    request(path(slug, date) + "/moves", { token, method: "POST", body }, arcadeViewSchema),
};
