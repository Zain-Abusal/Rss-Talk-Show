import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { serviceClient } from "@/lib/supabase/server";
import {
  json,
  failure,
  readBody,
  requireOrigin,
  rateLimit,
  HttpError,
} from "@/lib/http";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const admin = await requireAdmin();
    await rateLimit(request, "check-in", 120, 60, admin.id);
    const { code } = z
      .object({ code: z.string().trim().min(1).max(2000) })
      .parse(await readBody(request));
    let token = code.replace(/^RSS1:/, "");
    if (code.includes("/ticket/")) {
      try {
        token = new URL(code).pathname.split("/ticket/")[1] ?? "";
      } catch {
        throw new HttpError(
          400,
          "Enter a valid ticket QR code or ticket number.",
        );
      }
    }
    if (!/^(?:[a-f0-9]{64}|RSS-[A-F0-9]{16})$/.test(token))
      throw new HttpError(
        400,
        "Enter a valid ticket QR code or ticket number.",
      );
    const { data, error } = await serviceClient().rpc("validate_ticket", {
      p_actor: admin.id,
      p_code: token,
    });
    if (error) throw error;
    return json(data);
  } catch (error) {
    return failure(error);
  }
}
