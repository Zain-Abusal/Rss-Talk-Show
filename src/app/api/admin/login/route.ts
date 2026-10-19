import { z } from "zod";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { adminConfigured } from "@/lib/admin";
import { serviceClient } from "@/lib/supabase/server";
import {
  ADMIN_COOKIE,
  SESSION_SECONDS,
  verifyAdminPassword,
  signAdminSession,
} from "@/lib/admin-password";
import {
  json,
  failure,
  HttpError,
  requireOrigin,
  readBody,
  rateLimit,
} from "@/lib/http";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    if (!adminConfigured())
      throw new HttpError(503, "Admin access has not been configured.");
    await rateLimit(request, "admin-login", 5, 900);
    const { password } = z
      .object({ password: z.string().min(1).max(200) })
      .strict()
      .parse(await readBody(request));
    if (
      !(await verifyAdminPassword(password, process.env.ADMIN_PASSWORD_HASH!))
    )
      throw new HttpError(401, "The admin password is incorrect.");
    const id = randomUUID();
    const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
    const { error } = await serviceClient()
      .from("admin_sessions")
      .insert({ id, expires_at: new Date(expires * 1000).toISOString() });
    if (error) throw error;
    const store = await cookies();
    store.set(
      ADMIN_COOKIE,
      signAdminSession(
        id,
        expires,
        process.env.ADMIN_SESSION_SECRET!,
        process.env.ADMIN_PASSWORD_HASH!,
      ),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: (process.env.SITE_URL ?? "").startsWith("https://"),
        path: "/",
        maxAge: SESSION_SECONDS,
      },
    );
    return json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
