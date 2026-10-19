"use client";
import { useRef, useState, useEffect } from "react";
import { Camera, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";
export function QrScanner({ onRead, onStart, disabled = false }: { onRead: (code: string) => void; onStart?: () => void; disabled?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const stop = useRef<(() => void) | null>(null);
  const active = useRef(true);
  const generation = useRef(0);
  const starting = useRef(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  function stopCamera() {
    generation.current++;
    starting.current = false;
    stop.current?.();
    stop.current = null;
    const stream = video.current?.srcObject;
    if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
    if (video.current) video.current.srcObject = null;
    setRunning(false);
  }
  useEffect(() => {
    active.current = true;
    generation.current++;
    return () => {
      active.current = false;
      stop.current?.();
    };
  }, []);
  async function start() {
    if (starting.current || disabled) return;
    starting.current = true;
    const session = ++generation.current;
    setError("");
    onStart?.();
    setRunning(true);
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      if (!active.current || session !== generation.current) return;
      const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 250 });
      let captured = false;
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
        video.current!,
        (result, _error, scanner) => {
          if (result && active.current && session === generation.current && !captured) {
            captured = true;
            scanner.stop();
            stopCamera();
            onRead(result.getText());
          }
        },
      );
      if (!active.current || session !== generation.current || captured) controls.stop();
      else stop.current = () => controls.stop();
    } catch {
      if (active.current && session === generation.current) {
        stopCamera();
        setError("Camera access is unavailable. Paste a ticket code below instead.");
      }
    } finally {
      if (session === generation.current) starting.current = false;
    }
  }
  return (
    <div className="scanner-camera">
      <video ref={video} muted playsInline autoPlay aria-label="Ticket QR camera preview" className={running ? "camera-preview" : "camera-preview camera-idle"} />
      <Button type="button" variant="outline" disabled={disabled} onClick={() => running ? stopCamera() : void start()}>
        {running ? <CameraOff size={17} aria-hidden="true" /> : <Camera size={17} aria-hidden="true" />}
        {running ? "Stop camera" : "Scan with camera"}
      </Button>
      <p className="form-note">Point the camera at a QR code. A scan checks in immediately. The camera stops after each ticket.</p>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
