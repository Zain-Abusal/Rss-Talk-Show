"use client";
import { useRef, useState, useEffect } from "react";
import { Camera, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";
export function QrScanner({ onRead }: { onRead: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stop = useRef<(() => void) | null>(null);
  const active = useRef(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      stop.current?.();
    };
  }, []);
  async function start() {
    setError("");
    setRunning(true);
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } } },
        video.current!,
        (result, _error, scanner) => {
          if (result && active.current) {
            scanner.stop();
            setRunning(false);
            onRead(result.getText());
          }
        },
      );
      if (!active.current) controls.stop();
      else stop.current = () => controls.stop();
    } catch {
      setRunning(false);
      setError(
        "Camera access is unavailable. Paste a ticket code below instead.",
      );
    }
  }
  return (
    <div className="scanner-camera">
      <video
        ref={video}
        muted
        playsInline
        autoPlay
        className={running ? "camera-preview" : "camera-preview camera-idle"}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          if (running) {
            stop.current?.();
            setRunning(false);
          } else void start();
        }}
      >
        {running ? <CameraOff size={17} /> : <Camera size={17} />}{" "}
        {running ? "Stop camera" : "Scan with camera"}
      </Button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
