"use client";
import { useState, useRef } from "react";
import Link from "@/components/motion/transition-link";
import { usePageNavigation } from "@/components/motion/page-navigation";
import { useSite } from "@/components/site/site-provider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
export function RecoverTicketForm() {
  const site = useSite();
  const navigate = usePageNavigation();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/tickets/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(values.get("email")).trim(),
          phone: String(values.get("phone")).trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Unable to find your ticket.");
      await navigate(result.ticketUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Please try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <Card className="recovery-card">
      <h2>Your registration details</h2>
      <p>
        Use the same email and full phone number, including country code, that
        you registered with.
      </p>
      {!site.configured && (
        <p className="preview-banner">
          Ticket recovery will be available when live registration is connected.
        </p>
      )}
      <form
        ref={formRef}
        method="post"
        action="/api/tickets/recover"
        onSubmit={submit}
      >
        <div className="form-field">
          <label htmlFor="recovery-email">Email address</label>
          <Input
            id="recovery-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={320}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="recovery-phone">Phone number</label>
          <Input
            id="recovery-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+971 50 123 4567"
            minLength={7}
            maxLength={40}
            required
          />
        </div>
        <Button disabled={pending || !site.configured} type="submit">
          {pending ? "Finding your ticket…" : site.content.recover.submitLabel}
          <ArrowRight size={17} />
        </Button>
        {error && (
          <p className="error form-error" role="alert">
            {error}
          </p>
        )}
      </form>
      <p className="form-note">
        This retrieves your existing ticket. It does not create another seat or
        a new QR code.
      </p>
      <p className="register-help">
        Changed your details or registered without a phone number?{" "}
        <Link href="/contact">Contact the event team.</Link>
      </p>
    </Card>
  );
}
