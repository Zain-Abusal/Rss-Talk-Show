import assert from "node:assert/strict";
import { readBody, HttpError } from "../src/lib/http";
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
