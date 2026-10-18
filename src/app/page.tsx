import Link from "@/components/motion/transition-link";
import { ArrowRight, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Artwork } from "@/components/artwork";
import { team } from "@/config/site";
export default function Home() {
  return (
    <div className="page home-page">
      <section className="hero">
        <div className="hero-copy">
          <Badge>RSS Talk</Badge>
          <h1>
            Every Voice
            <br />
            Has a Story<span className="period">.</span>
          </h1>
          <p>
            A platform for meaningful conversations,
            <br className="desktop-break" /> new perspectives, and ideas that
            matter.
          </p>
          <div className="actions">
            <Button asChild>
              <Link href="/about">
                Explore the Show <ArrowRight size={18} />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/tickets">
                Get Tickets <ArrowRight size={18} />
              </Link>
            </Button>
          </div>
        </div>
        <Artwork name="microphone" className="hero-art" />
      </section>
      <section
        className="team-section"
        aria-labelledby="team-title"
        data-reveal
      >
        <div className="section-rule">
          <span />
          <h2 id="team-title">Meet the Team</h2>
          <span />
        </div>
        <div className="team-grid">
          {team.map((member) => (
            <Card key={member.name} className="team-card">
              <div className="avatar">
                <UserRound size={32} strokeWidth={1.4} />
              </div>
              <div>
                <h3>{member.name}</h3>
                <p>{member.role}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
