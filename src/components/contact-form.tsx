"use client";
import { useState } from "react";
import { ArrowRight, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
export function ContactForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState(false);
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const next: Record<string, string> = {};
    if (!String(data.get("name")).trim()) next.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.get("email"))))
      next.email = "Please enter a valid email address.";
    if (String(data.get("question")).trim().length < 10)
      next.question = "Please write at least 10 characters.";
    setErrors(next);
    setPreview(Object.keys(next).length === 0);
  }
  return (
    <Card className="contact-card">
      <form onSubmit={submit} onChange={() => setPreview(false)} noValidate>
        <div className="form-row">
          {["name", "email"].map((name) => (
            <div className="form-field" key={name}>
              <label htmlFor={name}>{name === "name" ? "Name" : "Email"}</label>
              <Input
                id={name}
                name={name}
                type={name === "email" ? "email" : "text"}
                autoComplete={name}
                placeholder={name === "name" ? "Your name" : "you@example.com"}
                aria-invalid={!!errors[name]}
                aria-describedby={errors[name] ? `${name}-error` : undefined}
                required
              />
              {errors[name] && (
                <p className="error" id={`${name}-error`}>
                  {errors[name]}
                </p>
              )}
            </div>
          ))}
        </div>
        <div className="form-field">
          <label htmlFor="question">Your Question</label>
          <Textarea
            id="question"
            name="question"
            placeholder="Type your message here…"
            rows={5}
            required
            minLength={10}
            aria-invalid={!!errors.question}
            aria-describedby={errors.question ? "question-error" : undefined}
          />
          {errors.question && (
            <p className="error" id="question-error">
              {errors.question}
            </p>
          )}
        </div>
        <Button type="submit" className="send-button">
          <Send size={19} /> Send Message <ArrowRight size={18} />
        </Button>
        <p className="form-note">
          Preview only. Messages are not sent or stored.
        </p>
        <div role="status">
          {preview && (
            <p className="preview-feedback">
              Your form is ready. This preview does not send messages; your
              details remain on this page.
            </p>
          )}
        </div>
      </form>
    </Card>
  );
}
