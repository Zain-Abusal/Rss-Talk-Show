import { z } from "zod";
// Avoid dynamic-code probes under the production script nonce policy.
z.config({ jitless: true });
import { event } from "@/config/event";
import { team } from "@/config/site";
const text = z.string().trim().max(6000);
const faq = z.object({ question: text.min(1), answer: text.min(1) }).strict();
export const contentSchema = z
  .object({
    recover: z
      .object({ title: text, description: text, submitLabel: text })
      .strict(),
    home: z
      .object({
        title: text,
        description: text,
        exploreLabel: text,
        ticketsLabel: text,
        teamTitle: text,
      })
      .strict(),
    about: z
      .object({
        title: text,
        description: text,
        hostTitle: text,
        hostDescription: text,
        expectTitle: text,
        whyTitle: text,
        whyDescription: text,
        schedule: z
          .array(z.object({ title: text, time: text }).strict())
          .min(1)
          .max(12),
      })
      .strict(),
    tickets: z
      .object({
        title: text,
        description: text,
        ctaTitle: text,
        ctaDescription: text,
        registerLabel: text,
      })
      .strict(),
    contact: z
      .object({
        title: text,
        description: text,
        nameLabel: text,
        emailLabel: text,
        questionLabel: text,
        submitLabel: text,
        faqs: z.array(faq).max(20),
      })
      .strict(),
    register: z
      .object({ title: text, description: text, submitLabel: text })
      .strict(),
    thankYou: z
      .object({
        title: text,
        description: text,
        nextTitle: text,
        nextDescription: text,
      })
      .strict(),
    team: z.array(z.object({ name: text, role: text }).strict()).max(30),
    registrationFaqs: z.array(faq).max(20),
    footer: text,
  })
  .strict();
export type SiteContent = z.infer<typeof contentSchema>;
export const defaultContent: SiteContent = {
  recover: {
    title: "Find your ticket",
    description:
      "Enter the email address and phone number you used to register. We’ll show your original ticket and QR code.",
    submitLabel: "Find my ticket",
  },
  home: {
    title: "Every Voice\nHas a Story",
    description:
      "A platform for meaningful conversations, new perspectives, and ideas that matter.",
    exploreLabel: "Explore the Show",
    ticketsLabel: "Get Tickets",
    teamTitle: "Meet the Team",
  },
  about: {
    title: "What Is RSS Talk?",
    description:
      "RSS Talk is a school-organized talk show designed to bring together students, experts and changemakers for meaningful conversations. It aims to create a space where ideas are shared, perspectives are explored and every voice is heard.",
    hostTitle: "Who Is This Hosted By?",
    hostDescription:
      "RSS Talk is proudly hosted by our school’s media team, in collaboration with the student council and faculty, to create an engaging and impactful event for the school community.",
    expectTitle: "What Can You Expect?",
    whyTitle: "Why Join Us?",
    whyDescription:
      "Because great conversations inspire change. RSS Talk gives you the chance to learn from different voices, gain new insights and be part of a community that values open dialogue and fresh ideas.",
    schedule: event.schedule,
  },
  tickets: {
    title: "Be Part of the\nConversation",
    description:
      "Join us for an inspiring talk show filled with meaningful discussions, new ideas and fresh perspectives. Secure your spot today!",
    ctaTitle: "Get Your Ticket",
    ctaDescription:
      "Reserve your place and download your personal QR ticket after registration.",
    registerLabel: "Register Now",
  },
  contact: {
    title: "Questions? Let’s Talk",
    description:
      "Have a question about the event, tickets or anything else? Get in touch. We’re here to help!",
    nameLabel: "Name",
    emailLabel: "Email",
    questionLabel: "Your Question",
    submitLabel: "Send Message",
    faqs: [
      {
        question: "How can I register for the event?",
        answer:
          "Visit Tickets and choose Register Now. When registration is open, complete the form and save your personal QR ticket.",
      },
      {
        question: "Is there an age limit to attend?",
        answer:
          "Attendance guidelines will be shared once confirmed by the event team.",
      },
      {
        question: "Will there be seating available?",
        answer:
          "Registration closes automatically when the configured seat limit is reached.",
      },
      {
        question: "How will I receive my ticket?",
        answer:
          "Your ticket is available immediately after registration. Download or save the ticket page. Email delivery is not currently provided.",
      },
    ],
  },
  register: {
    title: "Your place in the conversation",
    description: "Complete your details to reserve a seat at RSS Talk Show.",
    submitLabel: "Reserve my seat",
  },
  thankYou: {
    title: "Thank you for registering",
    description:
      "Your seat is reserved. Save your personal ticket and present its QR code at the entrance.",
    nextTitle: "Keep your ticket ready",
    nextDescription:
      "Download your ticket or save its private link. Each ticket can be checked in once. Contact the event team if you need to update your details.",
  },
  team,
  registrationFaqs: [
    {
      question: "Does this form reserve a real seat?",
      answer:
        "When registration is open, a successful registration reserves one seat and creates a personal QR ticket.",
    },
    {
      question: "When and where is the show?",
      answer:
        "The event date, time and venue are shown above and will be updated by the event team.",
    },
    {
      question: "What happens when all seats are taken?",
      answer:
        "The registration form closes automatically. Cancelled tickets release their seats, and the team can update capacity.",
    },
  ],
  footer: "RSS Talk Show · Every voice has a story.",
};
export const fieldSchema = z
  .object({
    key: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
    label: z.string().trim().min(1).max(100),
    type: z.enum(["text", "email", "tel", "select", "textarea", "range"]),
    placeholder: z.string().max(160).default(""),
    required: z.boolean(),
    enabled: z.boolean(),
    options: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
  })
  .strict();
export const formSchema = z
  .array(fieldSchema)
  .min(5)
  .max(25)
  .superRefine((fields, ctx) => {
    const keys = fields.map((f) => f.key);
    if (new Set(keys).size !== keys.length)
      ctx.addIssue({ code: "custom", message: "Field keys must be unique." });
    for (const key of ["name", "email", "phone", "role", "grade"])
      if (!keys.includes(key))
        ctx.addIssue({ code: "custom", message: `Keep the ${key} field.` });
    for (const key of ["name", "email"]) {
      const field = fields.find((f) => f.key === key);
      if (!field?.enabled || !field.required)
        ctx.addIssue({
          code: "custom",
          message: `${key} must remain enabled and required.`,
        });
    }
    if (fields.find((f) => f.key === "email")?.type !== "email")
      ctx.addIssue({
        code: "custom",
        message: "Use the email input type for email.",
      });
    for (const field of fields)
      if (
        field.type === "select" &&
        field.enabled &&
        (!field.options.length ||
          new Set(field.options).size !== field.options.length)
      )
        ctx.addIssue({
          code: "custom",
          message: `Add unique options for ${field.label}.`,
        });
  });
export type FormField = z.infer<typeof fieldSchema>;
export const defaultFields: FormField[] = [
  {
    key: "name",
    label: "Full name",
    type: "text",
    required: true,
    enabled: true,
    placeholder: "Your full name",
    options: [],
  },
  {
    key: "email",
    label: "Email address",
    type: "email",
    required: true,
    enabled: true,
    placeholder: "you@example.com",
    options: [],
  },
  {
    key: "phone",
    label: "Phone number",
    type: "tel",
    required: true,
    enabled: true,
    placeholder: "+971 50 123 4567",
    options: [],
  },
  {
    key: "role",
    label: "Role",
    type: "select",
    required: true,
    enabled: true,
    placeholder: "Select your role",
    options: ["Speaker", "Teacher", "Student", "Parent"],
  },
  {
    key: "grade",
    label: "Grade",
    type: "range",
    required: true,
    enabled: true,
    placeholder: "Select your grade",
    options: [...Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`)],
  },
];
export type PublicSite = {
  configured: boolean;
  available: boolean;
  version: number;
  eventName: string;
  date: string;
  time: string;
  venue: string;
  location: string;
  maxSeats: number;
  registered: number;
  remaining: number;
  registrationOpen: boolean;
  canRegister: boolean;
  fields: FormField[];
  content: SiteContent;
};
export const fallbackSite: PublicSite = {
  configured: false,
  available: false,
  version: 1,
  eventName: "RSS Talk Show",
  date: event.date,
  time: event.time,
  venue: event.venue,
  location: event.location,
  maxSeats: 50,
  registered: 0,
  remaining: 50,
  registrationOpen: false,
  canRegister: false,
  fields: defaultFields,
  content: defaultContent,
};
export const settingsSchema = z
  .object({
    version: z.number().int().min(1),
    eventName: z.string().trim().min(1).max(100),
    date: text.max(100),
    time: text.max(100),
    venue: text.max(160),
    location: text.max(160),
    maxSeats: z.number().int().min(0).max(100000),
    registrationOpen: z.boolean(),
    fields: formSchema,
    content: contentSchema,
  })
  .strict();
export function validateAnswers(input: unknown, fields: FormField[]) {
  const values = z.record(z.string(), z.string().max(4000)).parse(input);
  const errors: Record<string, string> = {};
  const answers: Record<string, string> = {};
  for (const field of fields.filter((f) => f.enabled)) {
    if (field.key === "grade" && values.role?.toLowerCase() !== "student") {
      answers.grade = "";
      continue;
    }
    let value = (values[field.key] ?? "").trim();
    if (field.key === "grade" && /^\d+$/.test(value)) value = `Grade ${value}`;
    answers[field.key] = value;
    if (field.required && !value)
      errors[field.key] = `${field.label} is required.`;
    else if (
      value &&
      field.type === "email" &&
      !z.email().safeParse(value).success
    )
      errors[field.key] = "Enter a valid email address.";
    else if (
      value &&
      field.type === "tel" &&
      (!/^\+?[\d\s().-]{7,30}$/.test(value) ||
        value.replace(/\D/g, "").length < 7)
    )
      errors[field.key] = "Enter a valid phone number.";
    else if (
      value &&
      field.type === "range" &&
      !/^Grade (?:[1-9]|1[0-2])$/.test(value)
    )
      errors[field.key] = "Choose a grade from 1 to 12.";
    else if (value && field.type === "select" && !field.options.includes(value))
      errors[field.key] = "Choose one of the listed options.";
    if (value.length > (field.type === "textarea" ? 4000 : 320))
      errors[field.key] = "This answer is too long.";
  }
  if ((answers.name ?? "").length < 2)
    errors.name = "Please enter your full name.";
  return { answers, errors };
}
