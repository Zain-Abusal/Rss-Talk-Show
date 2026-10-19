"use client";
import { useState, useRef, useEffect } from "react";
import Link from "@/components/motion/transition-link";
import { usePageNavigation } from "@/components/motion/page-navigation";
import { useSite } from "@/components/site/site-provider";
import { validateAnswers, type PublicSite } from "@/lib/site/model";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GradeSlider } from "@/components/grade-slider";
import { Select } from "@/components/ui/select";
export function RegistrationForm({
  initialSite,
}: { initialSite?: PublicSite } = {}) {
  const context = useSite();
  const initial = initialSite ?? context;
  const [site, setSite] = useState(initial);
  const navigate = usePageNavigation();
  const ref = useRef<HTMLFormElement>(null);
  const requestId = useRef("");
  const [role, setRole] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const preview = !site.configured;
  useEffect(() => {
    if (!initial.configured) return;
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch("/api/site", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.ok) setSite((await response.json()) as PublicSite);
      } catch {
        if (!controller.signal.aborted)
          setSite((s) => ({ ...s, canRegister: false, available: false }));
      }
    }
    void refresh();
    const interval = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 10000);
    return () => {
      clearInterval(interval);
      controller.abort();
    };
  }, [initial.configured]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError("");
    const data = new FormData(e.currentTarget);
    const input = Object.fromEntries(
      site.fields
        .filter(
          (f) =>
            f.enabled &&
            (f.key !== "grade" || role.toLowerCase() === "student"),
        )
        .map((f) => [f.key, String(data.get(f.key) ?? "")]),
    );
    const validation = validateAnswers(input, site.fields);
    if (preview && !data.get("preview"))
      validation.errors.preview = "Please acknowledge that this is a demo.";
    setErrors(validation.errors);
    if (Object.keys(validation.errors).length) {
      requestAnimationFrame(() =>
        ref.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    setPending(true);
    try {
      if (preview) {
        await navigate("/thank-you");
        return;
      }
      if (!site.canRegister)
        throw new Error("Registration is currently closed.");
      requestId.current ||= crypto.randomUUID();
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: requestId.current,
          version: site.version,
          answers: validation.answers,
          website: String(data.get("website") ?? ""),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.fields) setErrors(result.fields);
        if (result.code === "IDEMPOTENCY_CONFLICT") requestId.current = "";
        if (
          ["FORM_CHANGED", "SOLD_OUT", "REGISTRATION_CLOSED"].includes(
            result.code,
          )
        ) {
          const fresh = await fetch("/api/site", { cache: "no-store" });
          if (fresh.ok) setSite(await fresh.json());
        }
        throw new Error(result.error ?? "Registration could not be completed.");
      }
      await navigate("/thank-you");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Please try again.");
    } finally {
      setPending(false);
    }
  }
  const closed = site.configured && !site.canRegister;
  return (
    <Card className="registration-card">
      <div className="form-heading">
        <span className="step">01</span>
        <div>
          <h2>Your details</h2>
          <p>One registration reserves one seat.</p>
        </div>
      </div>
      {preview ? (
        <p className="preview-banner">
          Preview only. No ticket is issued until registration is connected.
        </p>
      ) : closed ? (
        <p className="preview-banner" role="status">
          {!site.available
            ? "Registration is temporarily unavailable."
            : site.remaining === 0
              ? "All seats are reserved. Registration is closed."
              : "Registration is not open yet."}
        </p>
      ) : (
        <p className="preview-banner" role="status">
          {site.remaining} of {site.maxSeats} seats available. Save your ticket
          after registering.
        </p>
      )}
      <form
        method="post"
        action="/api/register"
        ref={ref}
        onSubmit={submit}
        noValidate
      >
        <fieldset disabled={pending || closed} className="form-fieldset">
          {site.fields
            .filter(
              (f) =>
                f.enabled &&
                (f.key !== "grade" || role.toLowerCase() === "student"),
            )
            .map((field) => (
              <div className="form-field" key={field.key}>
                <label htmlFor={`registration-${field.key}`}>
                  {field.label}
                  {field.required ? (
                    <span aria-hidden="true"> *</span>
                  ) : (
                    <span className="optional"> (optional)</span>
                  )}
                </label>
                {field.key === "grade" ? (
                  <GradeSlider
                    id={`registration-${field.key}`}
                    name={field.key}
                    invalid={!!errors[field.key]}
                    describedBy={
                      errors[field.key] ? `${field.key}-error` : undefined
                    }
                  />
                ) : field.type === "select" ? (
                  <Select
                    id={`registration-${field.key}`}
                    name={field.key}
                    required={field.required}
                    aria-invalid={!!errors[field.key]}
                    aria-describedby={
                      errors[field.key] ? `${field.key}-error` : undefined
                    }
                    defaultValue=""
                    onChange={
                      field.key === "role"
                        ? (e) => setRole(e.target.value)
                        : undefined
                    }
                  >
                    <option value="" disabled>
                      {field.placeholder || "Select an option"}
                    </option>
                    {field.options.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </Select>
                ) : field.type === "textarea" ? (
                  <Textarea
                    id={`registration-${field.key}`}
                    name={field.key}
                    placeholder={field.placeholder}
                    required={field.required}
                    maxLength={4000}
                    aria-invalid={!!errors[field.key]}
                    aria-describedby={
                      errors[field.key] ? `${field.key}-error` : undefined
                    }
                  />
                ) : (
                  <Input
                    id={`registration-${field.key}`}
                    name={field.key}
                    type={field.type}
                    autoComplete={
                      field.key === "name"
                        ? "name"
                        : field.key === "email"
                          ? "email"
                          : field.key === "phone"
                            ? "tel"
                            : "off"
                    }
                    placeholder={field.placeholder}
                    required={field.required}
                    maxLength={320}
                    aria-invalid={!!errors[field.key]}
                    aria-describedby={
                      errors[field.key] ? `${field.key}-error` : undefined
                    }
                  />
                )}
                {errors[field.key] && (
                  <p className="error" id={`${field.key}-error`}>
                    {errors[field.key]}
                  </p>
                )}
              </div>
            ))}
          <div className="honeypot" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>
          {preview && (
            <>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="preview"
                  required
                  aria-invalid={!!errors.preview}
                />
                <span>
                  I understand this is a demo and does not issue a ticket.
                </span>
              </label>
              {errors.preview && <p className="error">{errors.preview}</p>}
            </>
          )}
          <Button type="submit" disabled={pending || closed}>
            {pending
              ? "Completing registration…"
              : preview
                ? "Preview registration"
                : site.content.register.submitLabel}
            <ArrowRight size={18} />
          </Button>
        </fieldset>
        {error && (
          <p role="alert" className="error form-error">
            {error}
          </p>
        )}
        <p className="form-note">
          Required fields are marked with an asterisk.{" "}
          {preview
            ? "No data is sent."
            : "One active ticket per email address."}
        </p>
      </form>
      <p className="register-help">
        Have a question? <Link href="/contact">Contact the event team.</Link>
      </p>
    </Card>
  );
}
