import "server-only";
import { createClient } from "@supabase/supabase-js";
export function isConfigured() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}
export function serviceClient() {
  if (!isConfigured()) throw new Error("Supabase is not configured.");
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
      },
    },
  );
}
