import { getLiveSite } from "@/lib/site/server";
import { json } from "@/lib/http";
export async function GET() {
  return json(await getLiveSite());
}
