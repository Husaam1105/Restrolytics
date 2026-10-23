import type { ReactNode } from "react";

import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

/** Readable long-form layout for policy pages. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main id="main" className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24">
        <h1 className="text-headline">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated {updated}</p>
        <div className="legal-prose mt-10 space-y-8">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-bold [font-stretch:85%]">{title}</h2>
      <div className="space-y-3 leading-relaxed text-foreground/85 [&_a]:font-medium [&_a]:text-link [&_a]:underline-offset-4 hover:[&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
        {children}
      </div>
    </section>
  );
}
