import { getSite } from "@/lib/site/server";
import Link from "@/components/motion/transition-link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
export async function Registration() {
  const site = await getSite();
  return (
    <Button asChild>
      <Link href="/register">
        {site.content.tickets.registerLabel} <ArrowRight size={18} />
      </Link>
    </Button>
  );
}
