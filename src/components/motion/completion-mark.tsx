"use client";

import { useLayoutEffect, useRef } from "react";
import { Check } from "lucide-react";
import { PAGE_TRANSITION_END } from "./page-navigation";

/** Decorative confirmation for the demo. It never represents an issued ticket. */
export function CompletionMark() {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let played = false;

    function play() {
      if (!element || played || preference.matches) return;
      played = true;
      element.dataset.completion = "playing";
    }
    function handlePreference() {
      if (preference.matches && element) {
        played = true;
        delete element.dataset.completion;
      }
    }

    if (!preference.matches) {
      if (document.documentElement.dataset.pageDirection) {
        element.dataset.completion = "waiting";
        document.addEventListener(PAGE_TRANSITION_END, play, { once: true });
      } else {
        play();
      }
    }
    preference.addEventListener("change", handlePreference);
    return () => {
      document.removeEventListener(PAGE_TRANSITION_END, play);
      preference.removeEventListener("change", handlePreference);
    };
  }, []);

  return (
    <div ref={ref} className="completion-icon" aria-hidden="true">
      <span className="completion-ring" />
      <Check size={32} />
    </div>
  );
}
