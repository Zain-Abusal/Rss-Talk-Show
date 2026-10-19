import { cookies } from "next/headers";
import { getSite } from "@/lib/site/server";
import { findTicket } from "@/lib/tickets";
import { TicketCard } from "@/components/ticket-card";
import Link from "@/components/motion/transition-link";
import { ArrowRight } from "lucide-react";
import { CompletionMark } from "@/components/motion/completion-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
export const metadata = {
  title: "Registration confirmation",
  robots: { index: false, follow: false },
};
export default async function ThankYou() {
  const site = await getSite();
  const token = (await cookies()).get("rss_ticket")?.value;
  const ticket = token ? await findTicket(token) : null;
  if (ticket && token && ticket.status !== "cancelled")
    return (
      <div className="page thank-you-page">
        <CompletionMark />
        <Badge>Registration complete</Badge>
        <h1>{site.content.thankYou.title}</h1>
        <p>{site.content.thankYou.description}</p>
        <TicketCard token={token} />
        <Card className="next-steps">
          <h2>{site.content.thankYou.nextTitle}</h2>
          <p>{site.content.thankYou.nextDescription}</p>
        </Card>
      </div>
    );
  if (site.configured)
    return (
      <div className="page thank-you-page">
        <h1>Your ticket</h1>
        <p>
          No registration receipt was found in this browser. Use your private
          ticket link or retrieve it using your registration details.
        </p>
        <Link className="text-link" href="/recover-ticket">
          Find my ticket
        </Link>
      </div>
    );
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
