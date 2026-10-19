import "server-only";
import { cache } from "react";
import QRCode from "qrcode";
import { serviceClient, isConfigured } from "@/lib/supabase/server";
export const findTicket = cache(async (token: string) => {
  if (!isConfigured() || !/^[a-f0-9]{64}$/.test(token)) return null;
  const { data, error } = await serviceClient()
    .from("tickets")
    .select("id,ticket_number,name,role,grade,status,created_at,checked_in_at")
    .eq("qr_token", token)
    .maybeSingle();
  if (error) return null;
  return data;
});
export async function ticketQr(token: string) {
  return QRCode.toDataURL(`RSS1:${token}`, {
    width: 360,
    margin: 3,
    errorCorrectionLevel: "M",
    color: { dark: "#17324D", light: "#FFFFFF" },
  });
}
