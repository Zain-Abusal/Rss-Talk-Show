import QRCode from "qrcode";
import { findTicket } from "@/lib/tickets";
import { failure, HttpError, rateLimit } from "@/lib/http";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    await rateLimit(request, "ticket-download", 60, 60);
    const { token } = await params;
    const ticket = await findTicket(token);
    if (!ticket || ticket.status === "cancelled")
      throw new HttpError(404, "Valid ticket not found.");
    const png = await QRCode.toBuffer(`RSS1:${token}`, {
      type: "png",
      width: 600,
      margin: 4,
      errorCorrectionLevel: "M",
      color: { dark: "#17324D", light: "#FFFFFF" },
    });
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${ticket.ticket_number}.png"`,
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
