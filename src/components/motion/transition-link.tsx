"use client";

import NextLink from "next/link";
import { usePageNavigation } from "./page-navigation";

type Props = Omit<React.ComponentProps<typeof NextLink>, "onNavigate">;

/** Preserve Next prefetching, native anchors, modified clicks and new-tab behavior. */
export default function TransitionLink({
  href,
  replace,
  scroll,
  ...props
}: Props) {
  const navigate = usePageNavigation();
  return (
    <NextLink
      prefetch={process.env.NODE_ENV === "production"}
      {...props}
      href={href}
      replace={replace}
      scroll={scroll}
      onNavigate={(event) => {
        if (typeof href !== "string") return;
        event.preventDefault();
        void navigate(href, { replace, scroll });
      }}
    />
  );
}
