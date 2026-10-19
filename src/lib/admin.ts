import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { defaultContent } from "./site/model";
import { HttpError } from "./http";
import { isConfigured, serviceClient } from "./supabase/server";
import { ADMIN_COOKIE, verifyAdminSession } from "./admin-password";
export function adminSetupIssues() {
  const issues: string[] = [];
  if (!isConfigured())
    issues.push("Add SUPABASE_URL and a server SUPABASE_SECRET_KEY.");
  if (
    !/^scrypt:32768:8:1:[A-Za-z0-9_-]{22}:[A-Za-z0-9_-]{86}$/.test(
      process.env.ADMIN_PASSWORD_HASH ?? "",
    )
  )
    issues.push(
      "Generate ADMIN_PASSWORD_HASH with npm run admin:hash. Use the hash, not the plain password.",
    );
  if ((process.env.ADMIN_SESSION_SECRET?.length ?? 0) < 32)
    issues.push(
      "Set ADMIN_SESSION_SECRET to a random secret of at least 32 characters.",
    );
  return issues;
}
export function adminConfigured() {
  return adminSetupIssues().length === 0;
}
export const currentAdmin = cache(async () => {
  if (!adminConfigured()) return null;
  const store = await cookies();
  const value = store.get(ADMIN_COOKIE)?.value;
  if (!value) return null;
  const session = verifyAdminSession(
    value,
    process.env.ADMIN_SESSION_SECRET!,
    process.env.ADMIN_PASSWORD_HASH!,
  );
  if (!session) return null;
  const { data, error } = await serviceClient()
    .from("admin_sessions")
    .select("id")
    .eq("id", session.id)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return !error && data ? { id: session.id, email: "Administrator" } : null;
});
export async function requireAdmin() {
  const admin = await currentAdmin();
  if (!admin)
    throw new HttpError(
      401,
      "Sign in with the admin password.",
      "AUTH_REQUIRED",
    );
  return admin;
}
export const ticketColumns =
  "id,ticket_number,name,email,phone,role,grade,status,answers,created_at,updated_at,checked_in_at";
export async function dashboardData() {
  const db = serviceClient();
  const [settings, tickets, messages, audit, stats] = await Promise.all([
    db.from("event_settings").select("*").eq("id", 1).single(),
    db
      .from("tickets")
      .select(ticketColumns)
      .order("created_at", { ascending: false })
      .limit(500),
    db
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
    db
      .from("admin_audit")
      .select("id,action,ticket_id,details,created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    db.rpc("registration_analytics"),
  ]);
  if (
    settings.error ||
    tickets.error ||
    messages.error ||
    audit.error ||
    stats.error
  )
    throw new HttpError(
      503,
      "The database schema is not ready. Apply the migrations first.",
    );
  return {
    settings: {
      ...settings.data,
      content: { ...defaultContent, ...settings.data.content },
    },
    tickets: tickets.data ?? [],
    messages: messages.data ?? [],
    audit: audit.data ?? [],
    stats: stats.data,
  };
}
