import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Product", href: "/#product" },
  { label: "IQ Copilot", href: "/#iq" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" },
];

/** Public-site header. Sits on the ink hero; turns solid once you scroll. */
export function SiteHeader({ tone = "ink" }: { tone?: "ink" | "paper" }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onInk = tone === "ink";

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,box-shadow] duration-200",
        onInk ? "bg-ink text-ink-foreground" : "bg-background/90 text-foreground backdrop-blur-md",
        scrolled && (onInk ? "shadow-[0_1px_0_oklch(1_0_0/0.08)]" : "shadow-[0_1px_0_var(--color-border)]"),
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="rounded-lg" aria-label="Restrolytics home">
          <BrandMark
            glyphClassName={onInk ? "[&_path]:fill-ink-foreground [&_rect:not(:last-child)]:fill-ink" : undefined}
          />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                onInk ? "text-ink-muted hover:text-ink-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            asChild
            className={cn("hidden sm:inline-flex", onInk && "text-ink-foreground hover:bg-white/10 hover:text-ink-foreground")}
          >
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button variant={onInk ? "highlight" : "default"} asChild className="hidden sm:inline-flex">
            <Link to="/contact">Book a walkthrough</Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("md:hidden", onInk && "text-ink-foreground hover:bg-white/10 hover:text-ink-foreground")}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className={cn("border-t px-4 pt-2 pb-5 md:hidden", onInk ? "border-white/10" : "border-border")}
        >
          {NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center rounded-lg px-2 text-base font-medium"
            >
              {item.label}
            </a>
          ))}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="outline" asChild className={cn(onInk && "bg-transparent text-ink-foreground shadow-[0_0_0_1px_oklch(1_0_0/0.2)]")}>
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button variant={onInk ? "highlight" : "default"} asChild>
              <Link to="/contact">Book a walkthrough</Link>
            </Button>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
