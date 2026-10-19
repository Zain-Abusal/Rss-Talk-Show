"use client";
import Link from "@/components/motion/transition-link";
import { useState } from "react";
import { LockKeyhole, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
export function AdminLogin({
  configured,
  issues = [],
}: {
  configured: boolean;
  issues?: string[];
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: form.get("password") }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to sign in.");
      window.location.assign("/admin");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="admin-login-page">
      <Card className="admin-login-card">
        <span className="admin-lock">
          <LockKeyhole size={24} />
        </span>
        <span className="detail-label">RSS Talk Show</span>
        <h1>Event administration</h1>
        <p>Sign in to manage registrations, tickets and event information.</p>
        {!configured && (
          <div className="preview-banner">
            <p>Finish admin setup:</p>
            <ul>
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        )}
        <form method="post" action="/api/admin/login" onSubmit={submit}>
          <label htmlFor="admin-password">Admin password</label>
          <Input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={200}
            disabled={pending}
          />
          <Button type="submit" disabled={!configured || pending}>
            {pending ? "Signing in…" : "Sign in"}
            <ArrowRight size={16} />
          </Button>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </form>
        <Link className="text-link" href="/">
          Back to the site
        </Link>
      </Card>
    </div>
  );
}
