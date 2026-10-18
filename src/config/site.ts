export const navigation = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/tickets", label: "Tickets" },
  { href: "/contact", label: "Contact" },
];
export const team = [1, 2, 3].map((id) => ({
  name: `Team Member ${id}`,
  role: "Media Team",
}));
// Extracted directly from the user’s second WhatsApp artwork sheet.
export const artwork: Record<string, string | null> = {
  microphone: "/assets/illustrations/microphone.webp",
  conversation: "/assets/illustrations/conversation.webp",
  question: "/assets/illustrations/question.webp",
  ticket: "/assets/illustrations/ticket.webp",
  calendar: "/assets/icons/calendar.webp",
  clock: "/assets/icons/clock.webp",
  location: "/assets/icons/location.webp",
  logo: "/assets/logo/rss-talk-show.webp",
};
export const faqs = [
  {
    question: "How can I register for the event?",
    answer:
      "Visit the Tickets page and choose Register Now to explore the demo form. Live registration is not open yet; submitting the demo does not reserve a seat.",
  },
  {
    question: "Is there an age limit to attend?",
    answer:
      "Attendance guidelines have not been confirmed yet. Please check back for an update.",
  },
  {
    question: "Will there be seating available?",
    answer:
      "Seating arrangements will be shared when the venue details are finalized.",
  },
  {
    question: "How will I receive my ticket?",
    answer:
      "Ticket delivery details will be announced when registration opens.",
  },
];

export const registrationFaqs = [
  {
    question: "Does this form reserve a real seat?",
    answer:
      "Not yet. This is a demonstration of the registration experience. No information is submitted, no seat is reserved and no ticket is issued.",
  },
  {
    question: "When and where is the show?",
    answer:
      "The date, time and venue are still to be confirmed. We’ll update the event details here once they are finalized.",
  },
  {
    question: "What happens after I fill in the form?",
    answer:
      "In this preview, you’ll see the thank-you page. A live registration and ticket delivery service will be connected in a later phase.",
  },
];
