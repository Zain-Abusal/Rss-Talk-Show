import { dashboardData, requireAdmin } from "@/lib/admin";
import { json, failure } from "@/lib/http";
export async function GET() {
  try {
    await requireAdmin();
    return json(await dashboardData());
  } catch (error) {
    return failure(error);
  }
}
