import Link from "@/components/motion/transition-link";
import { Badge } from "@/components/ui/badge";
import { Artwork } from "@/components/artwork";
import { RecoverTicketForm } from "@/components/recover-ticket-form";
import { getSite } from "@/lib/site/server";
export const metadata = {
  title: "Find your ticket",
  robots: { index: false, follow: false },
};
export default async function RecoverTicket() {
  const site = await getSite();
  return (
    <div className="page recovery-page">
      <Link className="back-link" href="/tickets">
        Back to tickets
      </Link>
      <div className="recovery-layout">
        <section>
          <Badge>Your ticket</Badge>
          <h1>{site.content.recover.title}</h1>
          <p>{site.content.recover.description}</p>
          <Artwork name="ticket" className="recovery-art" />
        </section>
        <RecoverTicketForm />
      </div>
    </div>
  );
}
