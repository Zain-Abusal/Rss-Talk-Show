"use client";
import { useState } from "react";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
export function TicketSaveActions({
  token,
  number,
  qr,
}: {
  token: string;
  number: string;
  qr: string;
}) {
  const [message, setMessage] = useState("");
  async function share() {
    setMessage("");
    try {
      const encoded = atob(qr.split(",")[1]);
      const bytes = Uint8Array.from(encoded, (char) => char.charCodeAt(0));
      const file = new File([bytes], `${number}.png`, { type: "image/png" });
      if (!navigator.canShare?.({ files: [file] }) || !navigator.share) {
        setMessage(
          "Use Download image, or touch and hold the QR image to save it.",
        );
        return;
      }
      await navigator.share({ files: [file], title: "RSS Talk Show ticket" });
    } catch (reason) {
      if (!(reason instanceof Error && reason.name === "AbortError"))
        setMessage("Sharing is unavailable. Use Download image instead.");
    }
  }
  return (
    <div className="ticket-save-actions">
      <Button asChild>
        <a href={`/api/tickets/${token}/qr`} download={`${number}.png`}>
          <Download size={16} />
          Download image
        </a>
      </Button>
      <Button type="button" variant="outline" onClick={() => void share()}>
        <Share2 size={16} />
        Save or share
      </Button>
      <p className="form-note">
        Keep a copy in Photos or Files. Your phone’s share menu shows the
        available save options.
      </p>
      {message && (
        <p role="status" className="form-note">
          {message}
        </p>
      )}
    </div>
  );
}
