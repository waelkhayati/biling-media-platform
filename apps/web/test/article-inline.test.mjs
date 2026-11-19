import assert from "node:assert/strict";
import { test } from "node:test";
import { articleInline } from "../src/lib/article-inline.ts";

test("parses supported rich text and normalizes HTTPS hyperlinks", () => {
  assert.deepEqual(articleInline("**Bold** and *italic* [source](https://example.test)"), [
    { type: "bold", text: "Bold" },
    { type: "text", text: " and " },
    { type: "italic", text: "italic" },
    { type: "text", text: " " },
    { type: "link", text: "source", href: "https://example.test/" },
  ]);
});

test("leaves arbitrary HTML and unsafe hyperlinks as plain text", () => {
  for (const input of [
    "<img src=x onerror=alert(1)>",
    "[label](javascript:alert(1))",
    "[label](data:text/html,example)",
    "[label](//example.test)",
    "[label](https://user:pass@example.test)",
  ]) {
    const parts = articleInline(input);
    assert.ok(parts.every(({ type }) => type === "text"));
    assert.equal(parts.map(({ text }) => text).join(""), input);
  }
});
