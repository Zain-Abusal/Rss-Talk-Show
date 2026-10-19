"use client";
import { createContext, useContext } from "react";
import { type PublicSite } from "@/lib/site/model";
const SiteContext = createContext<PublicSite | null>(null);
export function SiteProvider({
  site,
  children,
}: {
  site: PublicSite;
  children: React.ReactNode;
}) {
  return <SiteContext.Provider value={site}>{children}</SiteContext.Provider>;
}
export function useSite() {
  const site = useContext(SiteContext);
  if (!site) throw new Error("SiteProvider is required.");
  return site;
}
