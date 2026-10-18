"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Progressive enhancement: content remains visible without JavaScript or motion. */
export function PageMotion() {
  const pathname = usePathname();

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Set<Animation>();
    let observer: IntersectionObserver | undefined;

    function stop() {
      observer?.disconnect();
      animations.forEach((animation) => animation.cancel());
      animations.clear();
    }

    function observe() {
      stop();
      if (preference.matches || !("IntersectionObserver" in window)) return;

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            observer?.unobserve(entry.target);
            // Never interrupt someone focusing or completing an interactive field.
            if (entry.target.contains(document.activeElement)) continue;
            const animation = entry.target.animate(
              [
                { opacity: 0.45, transform: "translateY(12px)" },
                { opacity: 1, transform: "translateY(0)" },
              ],
              { duration: 460, easing: "cubic-bezier(0.2, 0.65, 0.3, 1)" },
            );
            animations.add(animation);
            animation.onfinish = () => animations.delete(animation);
            animation.oncancel = () => animations.delete(animation);
          }
        },
        { threshold: 0, rootMargin: "0px 0px 32px 0px" },
      );

      // Above-the-fold content has its own short CSS entrance. Only observe
      // sections that start below the viewport, avoiding a post-hydration flash.
      document
        .querySelectorAll<HTMLElement>("#main [data-reveal]")
        .forEach((section) => {
          if (section.getBoundingClientRect().top >= window.innerHeight) {
            observer?.observe(section);
          }
        });
    }

    function handleFocus(event: FocusEvent) {
      if (!(event.target instanceof Element)) return;
      const section = event.target.closest("[data-reveal]");
      if (!section) return;
      observer?.unobserve(section);
      section.getAnimations().forEach((animation) => animation.cancel());
    }

    observe();
    preference.addEventListener("change", observe);
    document.addEventListener("focusin", handleFocus);
    return () => {
      stop();
      preference.removeEventListener("change", observe);
      document.removeEventListener("focusin", handleFocus);
    };
  }, [pathname]);

  return null;
}
