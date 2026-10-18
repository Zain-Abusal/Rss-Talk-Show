import Link from "@/components/motion/transition-link";
import { ArrowRight } from "lucide-react";
import { CompletionMark } from "@/components/motion/completion-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
export const metadata = {
  title: "Thank you | Registration preview",
  robots: { index: false, follow: false },
};
export default function ThankYou() {
  return (
    <div className="page thank-you-page">
      <CompletionMark />
      <Badge>Registration preview</Badge>
      <h1>
        Thank you for registering<span className="period">.</span>
      </h1>
      <p>
        You’ve reached the end of the demo. We look forward to bringing our
        school community together for meaningful conversations.
      </p>
      <Card className="next-steps" data-reveal>
        <h2>What happens next?</h2>
        <p>
          <strong>This is a preview only.</strong> No registration was
          submitted, no seat has been reserved and no ticket or confirmation
          email has been issued.
        </p>
        <p>
          Once live registration opens, this page will explain the confirmed
          next steps. For now, explore the show and keep an eye on the Tickets
          page for event updates.
        </p>
      </Card>
      <div className="actions">
        <Button asChild>
          <Link href="/about">
            Explore the Show <ArrowRight size={17} />
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
      <Link className="text-link" href="/contact">
        Questions? Let’s talk <ArrowRight size={15} />
      </Link>
    </div>
  );
}
