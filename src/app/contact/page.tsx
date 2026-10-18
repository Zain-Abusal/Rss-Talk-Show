import { Badge } from "@/components/ui/badge";
import { Artwork } from "@/components/artwork";
import { ContactForm } from "@/components/contact-form";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { faqs } from "@/config/site";
export const metadata = { title: "Contact" };
export default function Contact() {
  return (
    <div className="page contact-page">
      <section className="intro contact-intro">
        <div>
          <Badge>Contact</Badge>
          <h1>Questions? Let’s Talk</h1>
          <p>
            Have a question about the event, tickets or anything else?
            <br className="desktop-break" /> Get in touch. We’re here to help!
          </p>
        </div>
        <Artwork name="question" />
      </section>
      <div className="contact-grid" data-reveal>
        <ContactForm />
        <section className="faq-section">
          <h2>Frequently Asked Questions</h2>
          <Accordion type="single" collapsible>
            {faqs.map((faq, index) => (
              <AccordionItem
                key={faq.question}
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
