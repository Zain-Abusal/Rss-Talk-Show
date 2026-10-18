"use client";
import { useState, useRef } from "react";
import { usePageNavigation } from "@/components/motion/page-navigation";
import Link from "@/components/motion/transition-link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
export function RegistrationForm() {
  const navigate = usePageNavigation();
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const next: Record<string, string> = {};
    if (String(data.get("name") ?? "").trim().length < 2)
      next.name = "Please enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.get("email") ?? "")))
      next.email = "Please enter a valid email address.";
    if (!data.get("preview"))
      next.preview = "Please acknowledge that this is a demo.";
    setErrors(next);
    if (Object.keys(next).length) {
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    // Frontend-only transition: no data is sent, persisted or put into the URL.
    // Keep button feedback separate from the router transition. Awaiting the
    // view transition inside a React async transition would delay its own commit.
    setPending(true);
    try {
      await navigate("/thank-you");
    } finally {
      setPending(false);
    }
  }
  return (
    <Card className="registration-card">
      <div className="form-heading">
        <span className="step">01</span>
        <div>
          <h2>Your details</h2>
          <p>A few details to join the conversation.</p>
        </div>
      </div>
      <p className="preview-banner">
        Demo form · Please use sample details. Nothing is submitted or stored.
      </p>
      <form ref={formRef} onSubmit={submit} noValidate>
        <div className="form-field">
          <label htmlFor="registration-name">
            Full name <span aria-hidden="true">*</span>
          </label>
          <Input
            id="registration-name"
            name="name"
            autoComplete="name"
            placeholder="Your full name"
            required
            minLength={2}
            aria-invalid={!!errors.name}
            aria-describedby={
              errors.name ? "registration-name-error" : undefined
            }
          />
          {errors.name && (
            <p className="error" id="registration-name-error">
              {errors.name}
            </p>
          )}
        </div>
        <div className="form-field">
          <label htmlFor="registration-email">
            Email address <span aria-hidden="true">*</span>
          </label>
          <Input
            id="registration-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            aria-invalid={!!errors.email}
            aria-describedby={
              errors.email ? "registration-email-error" : undefined
            }
          />
          {errors.email && (
            <p className="error" id="registration-email-error">
              {errors.email}
            </p>
          )}
        </div>
        <div className="form-field">
          <label htmlFor="registration-school">
            School / organization <span className="optional">(optional)</span>
          </label>
          <Input
            id="registration-school"
            name="school"
            autoComplete="organization"
            placeholder="Your school or organization"
          />
        </div>
        <label className="checkbox-label" htmlFor="registration-preview">
          <input
            id="registration-preview"
            name="preview"
            type="checkbox"
            required
            aria-invalid={!!errors.preview}
            aria-describedby={
              errors.preview ? "registration-preview-error" : undefined
            }
          />
          <span>
            I understand this is a demo and does not register me for the event
            or issue a ticket.
          </span>
        </label>
        {errors.preview && (
          <p className="error" id="registration-preview-error">
            {errors.preview}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Opening preview…" : "Preview registration"}
          <ArrowRight size={18} />
        </Button>
        <p className="form-note">
          Required fields are marked with an asterisk.
        </p>
      </form>
      <p className="register-help">
        Have a question before you continue?{" "}
        <Link href="/contact">Let’s talk.</Link>
      </p>
    </Card>
  );
}
