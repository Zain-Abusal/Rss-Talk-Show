import { z } from "zod";
import { cookies } from "next/headers";
import { getLiveSite } from "@/lib/site/server";
import { serviceClient } from "@/lib/supabase/server";
import { validateAnswers } from "@/lib/site/model";
import {
  json,
  failure,
  HttpError,
  readBody,
  requireOrigin,
  rateLimit,
} from "@/lib/http";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    await rateLimit(request, "registration", 10, 600);
    const body = z
      .object({
        requestId: z.uuid(),
        version: z.number().int(),
        answers: z.record(z.string(), z.string().max(4000)),
        website: z.string().max(0).optional(),
      })
      .strict()
      .parse(await readBody(request));
    const site = await getLiveSite();
    if (!site.available)
      throw new HttpError(503, "Registration is temporarily unavailable.");
    const { answers, errors } = validateAnswers(body.answers, site.fields);
    if (Object.keys(errors).length)
      throw new HttpError(
        400,
        "Check the highlighted fields.",
        "INVALID_FIELDS",
        errors,
      );
    const { data, error } = await serviceClient().rpc("register_ticket", {
      p_request_id: body.requestId,
      p_answers: answers,
      p_form_version: body.version,
    });
    if (error) throw error;
    const store = await cookies();
    store.set("rss_ticket", data.qr_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: (process.env.SITE_URL ?? "").startsWith("https://"),
      path: "/",
      maxAge: 86400,
    });
    return json(
      {
        ticketNumber: data.ticket_number,
        ticketUrl: `/ticket/${data.qr_token}`,
      },
      201,
    );
  } catch (error) {
    return failure(error);
  }
}
