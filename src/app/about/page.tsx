import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Artwork } from "@/components/artwork";
import { getSite } from "@/lib/site/server";
export const metadata = { title: "About" };
export default async function About() {
  const {
    content: { about: copy },
  } = await getSite();
  return (
    <div className="page about-page">
      <section className="intro about-intro">
        <div>
          <Badge>About</Badge>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </div>
        <Artwork name="conversation" />
      </section>
      <div className="about-details" data-reveal>
        <section>
          <h2 className="small-heading">
            {copy.hostTitle}
            <span />
          </h2>
          <Card className="host-card">
            <p>{copy.hostDescription}</p>
          </Card>
        </section>
        <section className="schedule-section">
          <h2 className="small-heading">
            {copy.expectTitle}
            <span />
          </h2>
          <ol className="schedule">
            {copy.schedule.map((item, index) => (
              <li key={index}>
                <span className="step">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{item.title}</h3>
                <p>{item.time}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
      <section className="why-section" data-reveal>
        <h2 className="small-heading">
          {copy.whyTitle}
          <span />
        </h2>
        <Card className="why-card">
          <span className="star-icon">
            <Star fill="currentColor" size={28} />
          </span>
          <p>{copy.whyDescription}</p>
        </Card>
      </section>
    </div>
  );
}
