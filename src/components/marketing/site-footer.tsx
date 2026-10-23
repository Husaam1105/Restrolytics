import { Link } from "@tanstack/react-router";

import { BrandMark } from "@/components/brand-mark";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Overview", href: "/#product" },
      { label: "IQ Copilot", href: "/#iq" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "Sign in", href: "/auth" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-8">
        <div className="space-y-3">
          <BrandMark />
          <p className="max-w-xs text-sm text-muted-foreground">
            Sales, stock, shifts and payroll for independent restaurants, with a copilot that knows
            your numbers.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h2 className="text-sm font-semibold [font-stretch:100%]">{col.title}</h2>
            <ul className="mt-3 space-y-1">
              {col.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="inline-flex min-h-9 items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Restrolytics</p>
          <p>
            Questions?{" "}
            <Link to="/contact" className="underline underline-offset-4 hover:text-foreground">
              Talk to us
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
