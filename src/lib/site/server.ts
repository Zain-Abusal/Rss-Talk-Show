import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { serviceClient, isConfigured } from "@/lib/supabase/server";
import {
  fallbackSite,
  defaultContent,
  contentSchema,
  formSchema,
  type PublicSite,
} from "./model";
async function readSite(): Promise<PublicSite> {
  const { data, error } = await serviceClient()
    .from("event_settings")
    .select(
      "event_name,date_label,time_label,venue,location,max_seats,registered_count,registration_open,version,form_fields,content",
    )
    .eq("id", 1)
    .single();
  if (error || !data) throw error;
  const remaining = Math.max(0, data.max_seats - data.registered_count);
  return {
    configured: true,
    available: true,
    eventName: data.event_name,
    date: data.date_label,
    time: data.time_label,
    venue: data.venue,
    location: data.location,
    maxSeats: data.max_seats,
    registered: data.registered_count,
    remaining,
    registrationOpen: data.registration_open,
    canRegister: data.registration_open && remaining > 0,
    version: data.version,
    fields: formSchema.parse(data.form_fields),
    content: contentSchema.parse({ ...defaultContent, ...data.content }),
  };
}
const cachedSite = unstable_cache(
  readSite,
  ["rss-public-site-v2", process.env.SUPABASE_URL ?? "preview"],
  {
    revalidate: 30,
    tags: ["rss-public-site"],
  },
);
async function safelyRead(read: () => Promise<PublicSite>) {
  if (!isConfigured()) return fallbackSite;
  try {
    return await read();
  } catch {
    return { ...fallbackSite, configured: true };
  }
}
// Only public presentation is cached. Capacity and form checks bypass this cache.
export const getSite = cache(() => safelyRead(cachedSite));
export const getLiveSite = cache(() => safelyRead(readSite));
