import Link from "@/components/motion/transition-link";
import { ArrowRight } from "lucide-react";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { registrationFaqs } from "@/config/site";
export function EventFaq() {
  return (
    <section
      className="ticket-faq"
      aria-labelledby="registration-faq-title"
      data-reveal
    >
      <div>
        <h2 id="registration-faq-title">A few things to know</h2>
        <p>Event details and how the registration preview works.</p>
        <Link className="text-link" href="/contact">
          Have another question? <ArrowRight size={15} />
        </Link>
      </div>
      <Accordion type="single" collapsible>
        {registrationFaqs.map((faq, index) => (
          <AccordionItem
            key={faq.question}
            value={`registration-${index}`}
            title={faq.question}
          >
            {faq.answer}
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
