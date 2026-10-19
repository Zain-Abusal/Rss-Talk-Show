import assert from "node:assert/strict";
import { readBody, requireOrigin, HttpError } from "../src/lib/http";
const previousSiteUrl = process.env.SITE_URL;
try {
  process.env.SITE_URL = "https://event.example";
  assert.doesNotThrow(() => requireOrigin(new Request("http://internal/api/admin/login", {
    headers: { Origin: "https://event.example" },
  })));
  for (const origin of [null, "null", "https://attacker.example", "http://event.example", "https://event.example:444"]) {
    assert.throws(() => requireOrigin(new Request("http://internal/api/admin/login", {
      headers: origin === null ? {} : { Origin: origin },
    })), (error: unknown) => error instanceof HttpError && error.status === 403 && error.code === "ORIGIN_MISMATCH");
  }
} finally {
  if (previousSiteUrl === undefined) delete process.env.SITE_URL;
  else process.env.SITE_URL = previousSiteUrl;
}
const request = (chunks: string[], headers?: HeadersInit) =>
  new Request("http://localhost/api/register", {
    method: "POST",
    headers,
    body: new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
        controller.close();
      },
    }),
    // Node requires duplex for streaming request bodies.
    duplex: "half",
  } as RequestInit);
await assert.rejects(readBody(request(["{}"], { "content-length": "100001" })),
  (error: unknown) => error instanceof HttpError && error.status === 413);
let cancelled = false;
const streamed = new Request("http://localhost/api/register", {
  method: "POST",
  body: new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(50001)); },
    cancel() { cancelled = true; },
  }),
  duplex: "half",
} as RequestInit);
await assert.rejects(readBody(streamed),
  (error: unknown) => error instanceof HttpError && error.status === 413);
assert(cancelled, "Oversized streams must be cancelled");
await assert.rejects(readBody(request(['{"value":"', "é".repeat(50000), '"}'])),
  (error: unknown) => error instanceof HttpError && error.status === 413);
assert.deepEqual(await readBody(request(['{"value":', '"hello"}'])), {value: "hello"});
await assert.rejects(readBody(request(['invalid'])),
  (error: unknown) => error instanceof HttpError && error.status === 400);
console.log("HTTP body limits passed: declared, streaming, UTF-8 bytes, JSON parsing.");
