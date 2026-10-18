import Image from "next/image";
import { artwork } from "@/config/site";
const dimensions: Record<string, { width: number; height: number }> = {
  microphone: { width: 605, height: 446 },
  conversation: { width: 325, height: 242 },
  question: { width: 286, height: 226 },
  ticket: { width: 263, height: 229 },
  calendar: { width: 199, height: 207 },
  clock: { width: 219, height: 193 },
  location: { width: 189, height: 173 },
};
export function Artwork({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  const src = artwork[name];
  const size = dimensions[name] ?? { width: 600, height: 450 };
  return (
    <div className={`artwork ${className}`} aria-hidden="true">
      {src ? (
        <Image
          src={src}
          alt=""
          {...size}
          sizes={
            ["calendar", "clock", "location"].includes(name)
              ? "60px"
              : name === "ticket"
                ? "240px"
                : "(max-width: 760px) 85vw, (max-width: 1680px) 42vw, 650px"
          }
          priority={name === "microphone" && className === "hero-art"}
          loading={
            name === "microphone" && className === "hero-art"
              ? undefined
              : [
                    "conversation",
                    "question",
                    "calendar",
                    "clock",
                    "location",
                  ].includes(name)
                ? "eager"
                : undefined
          }
        />
      ) : null}
    </div>
  );
}
