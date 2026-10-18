import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Artwork } from "@/components/artwork";
import { event } from "@/config/event";
export const metadata = { title: "About" };
export default function About() {
  return (
    <div className="page about-page">
      <section className="intro about-intro">
        <div>
          <Badge>About</Badge>
          <h1>What Is RSS Talk?</h1>
          <p>
            RSS Talk is a school-organized talk show designed to bring together
            students, experts and changemakers for meaningful conversations. It
            aims to create a space where ideas are shared, perspectives are
            explored and every voice is heard.
          </p>
        </div>
        <Artwork name="conversation" />
      </section>
      <div className="about-details" data-reveal>
        <section>
          <h2 className="small-heading">
            Who Is This Hosted By? <span />
          </h2>
          <Card className="host-card">
            <p>
              RSS Talk is proudly hosted by our school’s media team, in
              collaboration with the student council and faculty, to create an
              engaging and impactful event for the school community.
            </p>
          </Card>
        </section>
        <section className="schedule-section">
          <h2 className="small-heading">
            What Can You Expect? <span />
          </h2>
          <ol className="schedule">
            {event.schedule.map((item, index) => (
              <li key={item.title}>
                <span className="step">0{index + 1}</span>
                <h3>{item.title}</h3>
                <p>{item.time}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
      <section className="why-section" data-reveal>
        <h2 className="small-heading">
          Why Join Us? <span />
        </h2>
        <Card className="why-card">
          <span className="star-icon">
            <Star fill="currentColor" size={28} />
          </span>
          <p>
            Because great conversations inspire change. RSS Talk gives you the
            chance to learn from different voices, gain new insights and be part
            of a community that values open dialogue and fresh ideas.
          </p>
        </Card>
      </section>
    </div>
  );
}
