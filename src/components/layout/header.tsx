"use client";
import Link from "@/components/motion/transition-link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { navigation, artwork } from "@/config/site";
import { Button } from "@/components/ui/button";
export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const activePath =
    ["/register", "/thank-you", "/recover-ticket"].includes(pathname) ||
    pathname.startsWith("/ticket/")
      ? "/tickets"
      : pathname;
  if (pathname.startsWith("/admin")) return null;
  return (
    <header className="header">
      <Link href="/" className="brand" aria-label="RSS Talk Show home">
        {artwork.logo ? (
          <Image
            src={artwork.logo}
            alt="RSS Talk Show"
            width={675}
            height={292}
            priority
          />
        ) : (
          <>
            <strong>
              RSS<span className="brand-dot">.</span>
            </strong>
            <span>
              Talk
              <br />
              Show
            </span>
          </>
        )}
      </Link>
      <nav className="desktop-nav" aria-label="Main navigation">
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={activePath === item.href ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <Button asChild className="header-cta">
        <Link href="/tickets">
          Get Tickets <ArrowUpRight size={15} />
        </Link>
      </Button>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <Button
            variant="outline"
            className="menu-button"
            aria-label="Open navigation"
          >
            <Menu />
          </Button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="menu-overlay" />
          <Dialog.Content className="mobile-menu">
            <Dialog.Title>RSS Talk Show</Dialog.Title>
            <Dialog.Description className="sr-only">
              Choose a page
            </Dialog.Description>
            <Dialog.Close className="menu-close" aria-label="Close navigation">
              <X />
            </Dialog.Close>
            <nav aria-label="Mobile navigation">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  onClick={() => setOpen(false)}
                  href={item.href}
                  aria-current={activePath === item.href ? "page" : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <Link href="/recover-ticket" className="mobile-recovery-link" onClick={() => setOpen(false)}>
              Already registered? Find your ticket <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </header>
  );
}
