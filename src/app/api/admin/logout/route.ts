import { cookies } from "next/headers";
import { currentAdmin } from "@/lib/admin";
import { serviceClient } from "@/lib/supabase/server";
import { ADMIN_COOKIE } from "@/lib/admin-password";
import { json, failure, requireOrigin } from "@/lib/http";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const admin = await currentAdmin();
    if (admin)
      await serviceClient()
        .from("admin_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", admin.id);
    const store = await cookies();
    store.delete(ADMIN_COOKIE);
    return json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
