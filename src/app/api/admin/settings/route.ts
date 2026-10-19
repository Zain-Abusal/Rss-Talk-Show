import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { settingsSchema } from "@/lib/site/model";
import { serviceClient } from "@/lib/supabase/server";
import { json, failure, requireOrigin, readBody } from "@/lib/http";
export async function PUT(request: Request) {
  try {
    requireOrigin(request);
    const admin = await requireAdmin();
    const values = settingsSchema.parse(await readBody(request));
    const { data, error } = await serviceClient().rpc("save_event_settings", {
      p_actor: admin.id,
      p_settings: values,
    });
    if (error) throw error;
    revalidateTag("rss-public-site");
    revalidatePath("/", "layout");
    return json({ version: data });
  } catch (error) {
    return failure(error);
  }
}
