import Image from "next/image";
import Link from "@/components/motion/transition-link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TicketSaveActions } from "@/components/ticket-save-actions";
import { getSite } from "@/lib/site/server";
import { findTicket, ticketQr } from "@/lib/tickets";
export async function TicketCard({ token }: { token: string }) {
  const ticket = await findTicket(token);
  if (!ticket) return null;
  const site = await getSite();
  const qr = ticket.status === "cancelled" ? null : await ticketQr(token);
  return (
    <Card className="issued-ticket">
      <div className="ticket-information">
        <span className="badge">
          {ticket.status === "cancelled"
            ? "Cancelled"
            : ticket.status === "checked_in"
              ? "Checked in"
              : "Admit one"}
        </span>
        <h2>{site.eventName}</h2>
        <p className="ticket-holder">{ticket.name}</p>
        <p>
          {ticket.role}
          {ticket.grade ? ` · ${ticket.grade}` : ""}
        </p>
        <dl className="registration-summary">
          <div>
            <dt>Date</dt>
            <dd>{site.date}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd>{site.time}</dd>
          </div>
          <div>
            <dt>Venue</dt>
            <dd>{site.venue}</dd>
          </div>
        </dl>
        <code>{ticket.ticket_number}</code>
        <p className="form-note">
          Keep this private ticket link safe. This ticket admits one person and
          can be checked in once.
        </p>
      </div>
      <div className="ticket-qr">
        {qr ? (
          <>
            <Image
              src={qr}
              alt="Your personal ticket QR code"
              width={240}
              height={240}
              unoptimized
            />
            <TicketSaveActions
              token={token}
              number={ticket.ticket_number}
              qr={qr}
            />
          </>
        ) : (
          <p>This ticket has been cancelled and is not valid for entry.</p>
        )}
        <Link className="text-link" href={`/ticket/${token}`}>
          Open private ticket <ArrowRight size={15} />
        </Link>
      </div>
    </Card>
  );
}
