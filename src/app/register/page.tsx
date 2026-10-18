import Link from "@/components/motion/transition-link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Artwork } from "@/components/artwork";
import { RegistrationForm } from "@/components/registration-form";
import { EventFaq } from "@/components/sections/event-faq";
import { event } from "@/config/event";
export const metadata = { title: "Register" };
export default function Register() {
  return (
    <div className="page register-page">
      <Link className="back-link" href="/tickets">
        <ArrowLeft size={16} />
        Back to tickets
      </Link>
      <div className="register-layout">
        <section className="register-intro">
          <Badge>Registration</Badge>
          <h1>
            Your place in the conversation<span className="period">.</span>
          </h1>
          <p>
            Explore the registration experience and get ready to be part of RSS
            Talk Show.
          </p>
          <Artwork name="ticket" className="register-art" />
          <dl className="registration-summary">
            <div>
              <dt>Date</dt>
              <dd>{event.date}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>{event.time}</dd>
            </div>
            <div>
              <dt>Venue</dt>
              <dd>{event.venue}</dd>
            </div>
          </dl>
        </section>
        <RegistrationForm />
      </div>
      <EventFaq />
    </div>
  );
}
