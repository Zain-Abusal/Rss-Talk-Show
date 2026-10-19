"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { navigation } from "@/config/site";

export const PAGE_TRANSITION_END = "rss:page-transition-end";

async function waitForVisibleArtwork() {
  const images = Array.from(
    document.querySelectorAll<HTMLImageElement>("#main img"),
  ).filter((image) => {
    const bounds = image.getBoundingClientRect();
    return (
      !image.complete && bounds.top < window.innerHeight && bounds.bottom > 0
    );
  });
  if (!images.length) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    Promise.all(images.map((image) => image.decode().catch(() => {}))),
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, 140);
    }),
  ]);
  if (timer) clearTimeout(timer);
}

// Registration sits after Tickets in the same reading order as the main navigation.
const routeOrder = navigation.flatMap(({ href }) =>
  href === "/tickets"
    ? [href, "/register", "/thank-you", "/recover-ticket"]
    : [href],
);
type NavigationOptions = { replace?: boolean; scroll?: boolean };
type Navigate = (href: string, options?: NavigationOptions) => Promise<void>;
type PendingNavigation = {
  target: string;
  commit: () => void;
  view?: ViewTransition;
  timer?: ReturnType<typeof setTimeout>;
};
const NavigationContext = createContext<Navigate | null>(null);

export function PageNavigation({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const currentPath = useRef(pathname);
  const pending = useRef<PendingNavigation | null>(null);
  const replayingHistory = useRef(false);

  const transitionTo = useCallback(
    (target: string, update: () => void, resetScroll: boolean) => {
      const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
      // Cancel first, including when the latest click returns to the current page.
      const previous = pending.current;
      pending.current = null;
      previous?.view?.skipTransition();
      previous?.commit();
      if (previous?.timer) clearTimeout(previous.timer);

      // Clicking the current page with no pending navigation needs no router
      // refresh. A redundant push can race a subsequent full navigation.
      if (target === currentPath.current && !previous) {
        delete document.documentElement.dataset.pageDirection;
        document.documentElement.style.removeProperty("--page-old-offset-y");
        if (resetScroll)
          window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        return Promise.resolve();
      }

      if (
        !document.startViewTransition ||
        preference.matches ||
        target === currentPath.current
      ) {
        delete document.documentElement.dataset.pageDirection;
        document.documentElement.style.removeProperty("--page-old-offset-y");
        update();
        return Promise.resolve();
      }

      const oldTop =
        document.getElementById("main")?.getBoundingClientRect().top ?? 0;
      const rank = (path: string) =>
        path.startsWith("/ticket/")
          ? routeOrder.indexOf("/recover-ticket") + 0.5
          : routeOrder.indexOf(path);
      const from = rank(currentPath.current);
      const to = rank(target);
      const direction =
        from !== -1 && to !== -1 && to < from ? "backward" : "forward";
      document.documentElement.dataset.pageDirection = direction;
      document.documentElement.style.setProperty("--page-old-offset-y", "0px");
      document.getElementById("main")?.setAttribute("data-page-arrival", "");

      let resolveCommit = () => {};
      const committed = new Promise<void>((resolve) => {
        resolveCommit = resolve;
      });
      const operation: PendingNavigation = { target, commit: resolveCommit };
      pending.current = operation;

      const view = document.startViewTransition(async () => {
        if (pending.current !== operation) return;
        startTransition(update);
        await committed;
        if (resetScroll && pending.current === operation) {
          window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        }
        if (pending.current === operation) {
          await waitForVisibleArtwork();
          if (pending.current === operation) {
            const newTop =
              document.getElementById("main")?.getBoundingClientRect().top ?? 0;
            document.documentElement.style.setProperty(
              "--page-old-offset-y",
              `${oldTop - newTop}px`,
            );
          }
        }
        if (operation.timer) clearTimeout(operation.timer);
      });
      operation.view = view;
      // Never hold a snapshot over a slow or interrupted route indefinitely.
      operation.timer = setTimeout(() => {
        view.skipTransition();
        operation.commit();
      }, 1600);

      const disableMotion = () => {
        if (preference.matches) view.skipTransition();
      };
      preference.addEventListener("change", disableMotion);
      void view.ready.catch(() => {});
      void view.updateCallbackDone.catch(() => {});
      return view.finished
        .catch(() => {})
        .finally(() => {
          if (operation.timer) clearTimeout(operation.timer);
          preference.removeEventListener("change", disableMotion);
          if (pending.current === operation) {
            pending.current = null;
            delete document.documentElement.dataset.pageDirection;
            document.documentElement.style.removeProperty(
              "--page-old-offset-y",
            );
            document.dispatchEvent(new Event(PAGE_TRANSITION_END));
          }
        });
    },
    [],
  );

  const navigate = useCallback<Navigate>(
    (href, options = {}) => {
      const target = new URL(href, window.location.href).pathname;
      return transitionTo(
        target,
        () => {
          if (options.replace)
            router.replace(href, { scroll: options.scroll ?? true });
          else router.push(href, { scroll: options.scroll ?? true });
        },
        options.scroll !== false,
      );
    },
    [router, transitionTo],
  );

  useLayoutEffect(() => {
    currentPath.current = pathname;
    if (pending.current?.target === pathname) pending.current.commit();
  }, [pathname]);

  useEffect(() => {
    function handleHistory(event: PopStateEvent) {
      if (replayingHistory.current) return;
      const target = window.location.pathname;
      if (
        target === currentPath.current ||
        !document.startViewTransition ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        return;
      // Capture before Next updates the DOM, then let its normal history handler run.
      // The actual history entry and its scroll restoration remain owned by Next/browser.
      event.stopImmediatePropagation();
      void transitionTo(
        target,
        () => {
          replayingHistory.current = true;
          try {
            window.dispatchEvent(
              new PopStateEvent("popstate", { state: event.state }),
            );
          } finally {
            replayingHistory.current = false;
          }
        },
        false,
      );
    }
    window.addEventListener("popstate", handleHistory, { capture: true });
    return () => {
      window.removeEventListener("popstate", handleHistory, { capture: true });
      const operation = pending.current;
      pending.current = null;
      operation?.view?.skipTransition();
      operation?.commit();
      if (operation?.timer) clearTimeout(operation.timer);
      delete document.documentElement.dataset.pageDirection;
      document.documentElement.style.removeProperty("--page-old-offset-y");
    };
  }, [transitionTo]);

  return (
    <NavigationContext.Provider value={navigate}>
      {children}
    </NavigationContext.Provider>
  );
}

export function usePageNavigation() {
  const navigate = useContext(NavigationContext);
  if (!navigate) throw new Error("usePageNavigation requires PageNavigation.");
  return navigate;
}
