import { Badge } from "@/components/ui/badge";
import { Artwork } from "@/components/artwork";
import { ContactForm } from "@/components/contact-form";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { getSite } from "@/lib/site/server";
export const metadata = { title: "Contact" };
export default async function Contact() {
  const {
    content: { contact: copy },
  } = await getSite();
  return (
    <div className="page contact-page">
      <section className="intro contact-intro">
        <div>
          <Badge>Contact</Badge>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </div>
        <Artwork name="question" />
      </section>
      <div className="contact-grid" data-reveal>
        <ContactForm />
        <section className="faq-section">
          <h2>Frequently Asked Questions</h2>
          <Accordion type="single" collapsible>
            {copy.faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`faq-${index}`}
                title={faq.question}
              >
                {faq.answer}
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </div>
    </div>
  );
}
