import { notFound } from "next/navigation";
import { findTicket } from "@/lib/tickets";
import { TicketCard } from "@/components/ticket-card";
export const metadata = {
  title: "Your ticket",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function TicketPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!(await findTicket(token))) notFound();
  return (
    <div className="page private-ticket-page">
      <h1>Your RSS Talk Show ticket</h1>
      <TicketCard token={token} />
    </div>
  );
}
