import { EventFaq } from "@/components/sections/event-faq";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Artwork } from "@/components/artwork";
import { Registration } from "@/components/registration";
import { event } from "@/config/event";
export const metadata = { title: "Tickets" };
export default function Tickets() {
  return (
    <div className="page tickets-page">
      <section className="ticket-top">
        <div>
          <Badge>Tickets</Badge>
          <h1>
            Be Part of the
            <br />
            Conversation<span className="period">.</span>
          </h1>
          <p>
            Join us for an inspiring talk show filled with meaningful
            discussions, new ideas and fresh perspectives. Secure your spot
            today!
          </p>
        </div>
        <div className="event-grid">
          <Card className="event-card">
            <Artwork name="calendar" />
            <div>
              <span className="detail-label">Date</span>
              <h2>{event.date}</h2>
            </div>
          </Card>
          <Card className="event-card">
            <Artwork name="clock" />
            <div>
              <span className="detail-label">Time</span>
              <h2>{event.time}</h2>
            </div>
          </Card>
          <Card className="event-card venue">
            <Artwork name="location" />
            <div>
              <span className="detail-label">Venue</span>
              <h2>{event.venue}</h2>
              <p>{event.location}</p>
            </div>
          </Card>
        </div>
      </section>
      <Card className="ticket-cta" data-reveal>
        <Artwork name="ticket" />
        <div>
          <h2>Get Your Ticket</h2>
          <p>
            Registration is quick and easy. Reserve your spot now and be part of
            an unforgettable experience.
          </p>
          <span className="preview-note">
            Demo registration available · No tickets issued
          </span>
        </div>
        <Registration />
      </Card>
      <EventFaq />
    </div>
  );
}
