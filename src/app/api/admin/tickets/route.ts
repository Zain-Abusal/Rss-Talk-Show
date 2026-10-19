import { z } from "zod";
import { requireAdmin, ticketColumns } from "@/lib/admin";
import { serviceClient } from "@/lib/supabase/server";
import { getLiveSite } from "@/lib/site/server";
import { validateAnswers } from "@/lib/site/model";
import { json, failure, readBody, requireOrigin, HttpError } from "@/lib/http";
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const page = Math.max(0, Number(url.searchParams.get("page")) || 0);
    const query = (url.searchParams.get("q") ?? "")
      .slice(0, 100)
      .replace(/[,%()]/g, "");
    let db = serviceClient()
      .from("tickets")
      .select(ticketColumns, { count: "exact" })
      .order("created_at", { ascending: false });
    if (query)
      db = db.or(
        `name.ilike.%${query}%,email.ilike.%${query}%,ticket_number.ilike.%${query}%`,
      );
    const { data, error, count } = await db.range(page * 50, page * 50 + 49);
    if (error) throw error;
    return json({ tickets: data, total: count, page });
  } catch (error) {
    return failure(error);
  }
}
export async function PUT(request: Request) {
  try {
    requireOrigin(request);
    const admin = await requireAdmin();
    const body = z
      .object({
        id: z.uuid(),
        status: z.enum(["registered", "checked_in", "cancelled"]),
        answers: z.record(z.string(), z.string().max(4000)),
      })
      .strict()
      .parse(await readBody(request));
    const site = await getLiveSite();
    const { answers, errors } = validateAnswers(body.answers, site.fields);
    if (Object.keys(errors).length)
      throw new HttpError(
        400,
        "Check the registration details.",
        "INVALID_FIELDS",
        errors,
      );
    const { data, error } = await serviceClient().rpc("admin_update_ticket", {
      p_actor: admin.id,
      p_id: body.id,
      p_values: { status: body.status, answers },
    });
    if (error) throw error;
    return json({ ticket: data });
  } catch (error) {
    return failure(error);
  }
}
