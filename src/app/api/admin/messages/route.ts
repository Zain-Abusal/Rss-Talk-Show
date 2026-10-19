import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { serviceClient } from "@/lib/supabase/server";
import { json, failure, requireOrigin, readBody } from "@/lib/http";
export async function PUT(request: Request) {
  try {
    requireOrigin(request);
    await requireAdmin();
    const { id, status } = z
      .object({ id: z.uuid(), status: z.enum(["new", "read", "resolved"]) })
      .strict()
      .parse(await readBody(request));
    const { error } = await serviceClient()
      .from("contact_messages")
      .update({ status })
      .eq("id", id);
    if (error) throw error;
    return json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
