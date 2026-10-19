import Link from "@/components/motion/transition-link";
import { ArrowRight, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Artwork } from "@/components/artwork";
import { getSite } from "@/lib/site/server";
export default async function Home() {
  const { content } = await getSite();
  const copy = content.home;
  return (
    <div className="page home-page">
      <section className="hero">
        <div className="hero-copy">
          <Badge>RSS Talk</Badge>
          <h1 className="multiline">
            {copy.title}
            <span className="period">.</span>
          </h1>
          <p>{copy.description}</p>
          <div className="actions">
            <Button asChild>
              <Link href="/about">
                {copy.exploreLabel}
                <ArrowRight size={18} />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/tickets">
                {copy.ticketsLabel}
                <ArrowRight size={18} />
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
          <h2 id="team-title">{copy.teamTitle}</h2>
          <span />
        </div>
        <div className="team-grid">
          {content.team.map((member, index) => (
            <Card key={index} className="team-card">
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
