import Link from "@/components/motion/transition-link";
import { EventFaq } from "@/components/sections/event-faq";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Artwork } from "@/components/artwork";
import { Registration } from "@/components/registration";
import { getLiveSite } from "@/lib/site/server";
export const metadata = { title: "Tickets" };
export default async function Tickets() {
  const site = await getLiveSite();
  const copy = site.content.tickets;
  return (
    <div className="page tickets-page">
      <section className="ticket-top">
        <div>
          <Badge>Tickets</Badge>
          <h1 className="multiline">
            {copy.title}
            <span className="period">.</span>
          </h1>
          <p>{copy.description}</p>
        </div>
        <div className="event-grid">
          {[
            { icon: "calendar", label: "Date", value: site.date },
            { icon: "clock", label: "Time", value: site.time },
            { icon: "location", label: "Venue", value: site.venue },
          ].map((item) => (
            <Card
              key={item.icon}
              className={`event-card ${item.icon === "location" ? "venue" : ""}`}
            >
              <Artwork name={item.icon} />
              <div>
                <span className="detail-label">{item.label}</span>
                <h2>{item.value}</h2>
                {item.icon === "location" && <p>{site.location}</p>}
              </div>
            </Card>
          ))}
        </div>
      </section>
      <Card className="ticket-cta" data-reveal>
        <Artwork name="ticket" />
        <div>
          <h2>{copy.ctaTitle}</h2>
          <p>{copy.ctaDescription}</p>
          <span className="preview-note">
            {!site.configured
              ? "Registration preview"
              : !site.available
                ? "Registration is temporarily unavailable"
                : site.canRegister
                  ? `${site.remaining} seats available`
                  : site.remaining === 0
                    ? "All seats reserved"
                    : "Registration opens soon"}
          </span>
        </div>
        <Registration />
      </Card>
      <p className="ticket-recovery-link">
        Already registered? <Link href="/recover-ticket">Find your ticket</Link>
      </p>
      <EventFaq />
    </div>
  );
}
