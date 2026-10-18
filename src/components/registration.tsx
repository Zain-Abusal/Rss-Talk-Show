import Link from "@/components/motion/transition-link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
export function Registration() {
  return (
    <Button asChild>
      <Link href="/register">
        Register Now <ArrowRight size={18} />
      </Link>
    </Button>
  );
}
