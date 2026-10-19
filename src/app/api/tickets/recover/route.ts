import { z } from "zod";
import { cookies } from "next/headers";
import { serviceClient } from "@/lib/supabase/server";
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
    await rateLimit(request, "ticket-recovery", 5, 900);
    const { email, phone } = z
      .object({
        email: z
          .email()
          .max(320)
          .transform((v) => v.toLowerCase()),
        phone: z
          .string()
          .trim()
          .min(7)
          .max(40)
          .refine(
            (v) =>
              /^\+?[\d ().-]+$/.test(v) && v.replace(/\D/g, "").length >= 7,
            "Enter the phone number used to register.",
          ),
      })
      .strict()
      .parse(await readBody(request));
    await rateLimit(request, "ticket-recovery-email", 10, 900, email);
    const { data, error } = await serviceClient().rpc("recover_ticket", {
      p_email: email,
      p_phone: phone,
    });
    if (error) throw error;
    if (!data)
      throw new HttpError(
        404,
        "No matching active ticket was found. Check both details or contact the event team.",
        "TICKET_NOT_FOUND",
      );
    (await cookies()).set("rss_ticket", data, {
      httpOnly: true,
      sameSite: "lax",
      secure: (process.env.SITE_URL ?? "").startsWith("https://"),
      path: "/",
      maxAge: 86400,
    });
    return json({ ticketUrl: `/ticket/${data}` });
  } catch (error) {
    return failure(error);
  }
}
