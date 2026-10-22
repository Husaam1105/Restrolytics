import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  Check,
  ChefHat,
  Megaphone,
  Sparkles,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Restaurant Management Packages — Restrolytics" },
      {
        name: "description",
        content:
          "Compare Restrolytics restaurant CRM, virtual management, and marketing packages, starting at $199 per location each month.",
      },
      { property: "og:title", content: "Restaurant Management Packages — Restrolytics" },
      {
        property: "og:description",
        content:
          "Restaurant CRM, hands-on virtual management, and consistent marketing support in one clear package.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const packages = [
  {
    name: "Team Essentials",
    price: "199",
    icon: Users,
    intro: "A central workspace for your restaurant team.",
    features: [
      "Restaurant CRM and team access",
      "Reports, invoices, menus, recipes and procedures",
      "Task assignment and completion tracking",
      "Opening, closing and cleaning checklists",
      "Delivery and invoice tracking",
      "Reminders, manager log and owner dashboard",
      "Guest information and inquiry tracking",
    ],
    bestFor: "Owners whose team will manage daily updates and follow-ups.",
  },
  {
    name: "Virtual Manager",
    price: "519",
    icon: Camera,
    intro: "Team Essentials plus 20 hours per week of remote management support.",
    features: [
      "Restaurant report review and CRM uploads",
      "Team follow-up for invoices and missing documents",
      "Delivery and invoice checks with store managers",
      "Discrepancy flags and unresolved issue tracking",
      "Checklist monitoring and overdue follow-up",
      "Vendor, maintenance, complaint and catering follow-up",
      "Scheduled camera checks and a weekly owner summary",
    ],
    bestFor: "Owners who need daily administration and team follow-through handled.",
  },
  {
    name: "Marketing Add-On",
    price: "599",
    icon: Megaphone,
    intro: "Consistent promotion and guest follow-up, available with either management plan.",
    features: [
      "Monthly marketing calendar",
      "12 social posts across two channels",
      "Two email campaigns and one SMS campaign",
      "Four Google Business Profile posts",
      "Up to 30 review replies",
      "Management of one paid-ad campaign",
      "Monthly marketing performance report",
    ],
    bestFor: "Restaurants that want consistent promotion and guest follow-up.",
  },
];

const completeFeatures = [
  "Team Essentials CRM, documents, checklists, tasks and owner dashboard",
  "20 hours per week of virtual manager support",
  "Scheduled camera checks, incident tracking and owner alerts",
  "Social, email, SMS, Google Business Profile, reviews and paid-ad management",
  "Weekly operations summaries and monthly marketing reports",
];

function BrandMark() {
  return (
    <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
      <ChefHat className="size-5" />
    </span>
  );
}

function PricingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-18 max-w-7xl items-center justify-between gap-3 px-5 lg:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <BrandMark />
            <span className="truncate font-display text-lg font-semibold">Restrolytics</span>
          </Link>
          <nav className="flex items-center gap-2" aria-label="Pricing navigation">
            <Button variant="ghost" className="hidden sm:inline-flex" asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild>
              <Link to="/signup">Request access <ArrowRight className="size-4" /></Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden border-b bg-foreground py-16 text-primary-foreground sm:py-20 lg:py-24">
        <div className="absolute inset-y-0 right-0 w-1/3 border-l border-primary-foreground/10 bg-primary/25" />
        <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 text-sm font-semibold text-brand-bright">
              <Sparkles className="size-4" /> SIMPLE, PER-LOCATION PRICING
            </p>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              The operating support your restaurant needs.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-primary-foreground/70">
              Keep your restaurant organized, your team accountable, and your marketing active—so you can focus on growth.
            </p>
            <p className="mt-5 text-sm font-semibold text-brand-bright">All prices are USD, per restaurant location.</p>
          </div>
        </div>
      </section>

      <section className="border-b bg-surface-subtle py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-5 lg:grid-cols-3">
            {packages.map((item) => (
              <article key={item.name} className="premium-panel flex h-full flex-col rounded-lg p-6 sm:p-7">
                <div className="flex size-11 items-center justify-center rounded-md bg-brand-soft text-primary">
                  <item.icon className="size-5" />
                </div>
                <h2 className="mt-6 text-2xl font-semibold">{item.name}</h2>
                <div className="mt-3 flex items-end gap-1">
                  <span className="font-display text-4xl font-semibold">${item.price}</span>
                  <span className="pb-1 text-sm text-muted-foreground">/month</span>
                </div>
                <p className="mt-4 min-h-14 text-sm leading-6 text-muted-foreground">{item.intro}</p>
                <ul className="mt-6 flex-1 space-y-3 border-t pt-6">
                  {item.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm leading-6">
                      <Check className="mt-1 size-4 shrink-0 text-success" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-7 border-l-2 border-coral pl-4 text-sm leading-6">
                  <span className="font-semibold">Best for: </span>{item.bestFor}
                </div>
                <Button variant="outline" className="mt-7 w-full" asChild>
                  <Link to="/signup">Request access <ArrowRight className="size-4" /></Link>
                </Button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <article className="overflow-hidden rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-premium)]">
            <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
              <div className="p-7 sm:p-10 lg:p-12">
                <div className="flex items-center gap-2 text-sm font-semibold text-brand-bright">
                  <BadgeCheck className="size-5" /> BEST VALUE
                </div>
                <h2 className="mt-5 text-3xl font-semibold sm:text-4xl">Complete Package</h2>
                <p className="mt-3 text-primary-foreground/70">Everything above in one bundle.</p>
                <div className="mt-8 flex flex-wrap items-end gap-x-4 gap-y-2">
                  <span className="font-display text-5xl font-semibold">$999</span>
                  <span className="pb-1 text-primary-foreground/70">per month, per location</span>
                </div>
                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                  <span className="text-primary-foreground/60">Regular combined price <s>$1,118</s></span>
                  <span className="font-semibold text-brand-bright">Save $119 every month</span>
                </div>
                <Button size="lg" className="mt-8 bg-primary-foreground text-primary hover:bg-primary-foreground/90" asChild>
                  <Link to="/signup">Request the complete package <ArrowRight className="size-4" /></Link>
                </Button>
              </div>
              <div className="border-t border-primary-foreground/15 bg-primary-foreground/5 p-7 sm:p-10 lg:border-l lg:border-t-0 lg:p-12">
                <p className="text-sm font-semibold text-brand-bright">WHAT’S INCLUDED</p>
                <ul className="mt-6 space-y-5">
                  {completeFeatures.map((feature) => (
                    <li key={feature} className="flex gap-3 leading-7">
                      <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-bright text-foreground">
                        <Check className="size-3" />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="border-y bg-surface-subtle py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.55fr_1.45fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold text-coral">SERVICE DETAILS</p>
            <h2 className="mt-3 text-3xl font-semibold">Clear coverage. No surprises.</h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Virtual manager support follows an agreed schedule. All remote operations work and camera checks share the included 20 hours each week.
            </p>
          </div>
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {[
              "Monthly billing, per restaurant location",
              "Up to four compatible cameras, checked twice each weekday",
              "Continuous camera monitoring requires a separate quote",
              "Additional manager hours are $5.99/hour with advance approval",
              "Advertising spend, SMS usage, equipment and third-party subscriptions are separate",
              "Your store team remains responsible for on-site restaurant management",
            ].map((term) => (
              <div key={term} className="flex gap-3 border-t pt-4 text-sm leading-6">
                <Check className="mt-1 size-4 shrink-0 text-primary" />
                <span>{term}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-foreground py-16 text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-5 md:flex-row md:items-center lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold">Your team runs the restaurant. We keep the details moving.</h2>
            <p className="mt-3 text-primary-foreground/65">Tell us about your location and we’ll help you choose the right level of support.</p>
          </div>
          <Button size="lg" className="shrink-0 bg-primary-foreground text-primary hover:bg-primary-foreground/90" asChild>
            <Link to="/signup">Request access <ArrowRight className="size-4" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <Link to="/" className="flex items-center gap-3"><BrandMark /><span className="font-display font-semibold">Restrolytics</span></Link>
          <p className="text-sm text-muted-foreground">Restaurant operations, virtual management and marketing.</p>
        </div>
      </footer>
    </main>
  );
}