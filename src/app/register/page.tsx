import Link from "@/components/motion/transition-link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Artwork } from "@/components/artwork";
import { RegistrationForm } from "@/components/registration-form";
import { EventFaq } from "@/components/sections/event-faq";
import { getLiveSite } from "@/lib/site/server";
export const metadata = { title: "Register" };
export default async function Register() {
  const site = await getLiveSite();
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
            {site.content.register.title}
            <span className="period">.</span>
          </h1>
          <p>{site.content.register.description}</p>
          <Artwork name="ticket" className="register-art" />
          <dl className="registration-summary">
            {[
              ["Date", site.date],
              ["Time", site.time],
              ["Venue", site.venue],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <div>
          <RegistrationForm initialSite={site} />
          <p className="ticket-recovery-link">
            Already registered?{" "}
            <Link href="/recover-ticket">Find your ticket</Link>
          </p>
        </div>
      </div>
      <EventFaq />
    </div>
  );
}
