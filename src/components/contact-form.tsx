"use client";
import { useState } from "react";
import { useSite } from "@/components/site/site-provider";
import { ArrowRight, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GradeSlider } from "@/components/grade-slider";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
export function ContactForm() {
  const site = useSite();
  const copy = site.content.contact;
  const [role, setRole] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const form = e.currentTarget;
    const data = new FormData(e.currentTarget);
    const next: Record<string, string> = {};
    if (!String(data.get("name")).trim()) next.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.get("email"))))
      next.email = "Please enter a valid email address.";
    if (String(data.get("question")).trim().length < 10)
      next.question = "Please write at least 10 characters.";
    if (!role) next.role = "Choose your role.";
    setErrors(next);
    if (Object.keys(next).length) {
      requestAnimationFrame(() =>
        form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    if (!site.configured) {
      setPreview(true);
      return;
    }
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(data.get("name")),
          email: String(data.get("email")),
          question: String(data.get("question")),
          role,
          grade: role === "Student" ? Number(data.get("grade")) : null,
        }),
      });
      const result = await response.json();
      setMessage(result.message ?? result.error ?? "Please try again.");
    } catch {
      setMessage("Unable to save your question. Please try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <Card className="contact-card">
      <form
        method="post"
        action="/api/contact"
        onSubmit={submit}
        onChange={() => {
          setPreview(false);
          setMessage("");
        }}
        noValidate
      >
        <div className="form-row">
          {["name", "email"].map((name) => (
            <div className="form-field" key={name}>
              <label htmlFor={name}>
                {name === "name" ? copy.nameLabel : copy.emailLabel}
              </label>
              <Input
                id={name}
                name={name}
                type={name === "email" ? "email" : "text"}
                maxLength={name === "email" ? 320 : 150}
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
          <label htmlFor="contact-role">Role</label>
          <Select
            id="contact-role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
            aria-invalid={!!errors.role}
          >
            <option value="" disabled>
              Select your role
            </option>
            {["Speaker", "Teacher", "Student", "Parent"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </Select>
          {errors.role && <p className="error">{errors.role}</p>}
        </div>
        {role === "Student" && (
          <div className="form-field">
            <label htmlFor="contact-grade">Grade</label>
            <GradeSlider id="contact-grade" />
          </div>
        )}
        <div className="form-field">
          <label htmlFor="question">{copy.questionLabel}</label>
          <Textarea
            id="question"
            name="question"
            placeholder="Type your message here…"
            rows={5}
            required
            minLength={10}
            maxLength={4000}
            aria-invalid={!!errors.question}
            aria-describedby={errors.question ? "question-error" : undefined}
          />
          {errors.question && (
            <p className="error" id="question-error">
              {errors.question}
            </p>
          )}
        </div>
        <Button type="submit" className="send-button" disabled={pending}>
          <Send size={19} />
          {pending ? "Saving…" : copy.submitLabel}
          <ArrowRight size={18} />
        </Button>
        <p className="form-note">
          {site.configured
            ? "Your question will be saved for the event team."
            : "Preview only. Messages are not sent or stored."}
        </p>
        <div role="status">
          {message && <p className="preview-feedback">{message}</p>}
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
