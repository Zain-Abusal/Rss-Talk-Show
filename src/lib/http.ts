import "server-only";
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { serviceClient, isConfigured } from "@/lib/supabase/server";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "REQUEST_FAILED",
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
export function requireOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.SITE_URL || request.url).origin;
  if (!origin || origin !== expected)
    throw new HttpError(
      403,
      "The site address does not match its configuration. Open the configured site address, or update SITE_URL and restart or redeploy.",
      "ORIGIN_MISMATCH",
    );
}
export async function readBody(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 100000)
    throw new HttpError(413, "The submitted content is too large.");
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 100000) {
          await reader.cancel();
          throw new HttpError(413, "The submitted content is too large.");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  const body = Buffer.concat(chunks, size).toString("utf8");
  try {
    return JSON.parse(body);
  } catch {
    throw new HttpError(400, "Enter valid form data.");
  }
}
export async function rateLimit(
  request: Request,
  kind: string,
  limit = 10,
  seconds = 600,
  identity?: string,
) {
  if (!isConfigured())
    throw new HttpError(503, "Registration is not configured yet.");
  const ip =
    identity ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local";
  const key = createHash("sha256").update(`${kind}:${ip}`).digest("hex");
  const { data, error } = await serviceClient().rpc("consume_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: seconds,
  });
  if (error)
    throw new HttpError(
      503,
      "The service is temporarily unavailable. Please try again.",
    );
  if (!data)
    throw new HttpError(
      429,
      "Too many attempts. Please wait before trying again.",
    );
}
export function failure(error: unknown) {
  if (error instanceof HttpError)
    return json(
      { error: error.message, code: error.code, fields: error.fields },
      error.status,
    );
  if (error instanceof z.ZodError)
    return json(
      {
        error: error.issues[0]?.message ?? "Check the submitted values.",
        code: "INVALID_INPUT",
      },
      400,
    );
  const e = error as { code?: string; message?: string };
  const codes: Record<string, [number, string]> = {
    SOLD_OUT: [409, "All seats are currently reserved."],
    REGISTRATION_CLOSED: [409, "Registration is currently closed."],
    FORM_CHANGED: [
      409,
      "The registration form has changed. Review the updated fields and try again.",
    ],
    IDEMPOTENCY_CONFLICT: [
      409,
      "This request has already been used. Please try again.",
    ],
    SETTINGS_CONFLICT: [
      409,
      "Another admin updated these settings. Reload before saving.",
    ],
    CAPACITY_BELOW_REGISTRATIONS: [
      409,
      "Capacity cannot be lower than the number of active tickets.",
    ],
    TICKET_NOT_FOUND: [404, "Ticket not found."],
    INVALID_OPTION: [400, "Choose one of the current form options."],
    REQUIRED_FIELD: [400, "Complete the required fields."],
    INVALID_GRADE: [400, "Choose a grade from 1 to 12."],
    INVALID_PHONE: [400, "Enter a valid phone number."],
    INVALID_EMAIL: [400, "Enter a valid email address."],
    USE_CHECK_IN: [400, "Use the scanner to check in this ticket."],
    ADMIN_REQUIRED: [403, "Administrator access is required."],
  };
  for (const [code, [status, message]] of Object.entries(codes))
    if (e.message?.includes(code))
      return json({ error: message, code }, status);
  if (e.code === "23505")
    return json(
      {
        error:
          "This email already has an active ticket. Contact the event team if you need help.",
        code: "DUPLICATE_EMAIL",
      },
      409,
    );
  return json(
    {
      error: "The request could not be completed. Please try again.",
      code: "SERVICE_ERROR",
    },
    503,
  );
}
