"use client";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Plus } from "lucide-react";
export const Accordion = AccordionPrimitive.Root;
export function AccordionItem({
  value,
  title,
  children,
}: {
  value: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AccordionPrimitive.Item value={value} className="faq-item">
      <AccordionPrimitive.Header>
        <AccordionPrimitive.Trigger className="faq-trigger">
          {title}
          <Plus size={19} />
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Content className="faq-content">
        <p>{children}</p>
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  );
}
