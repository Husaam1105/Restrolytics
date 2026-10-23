import { canonical } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, Camera, Check, Megaphone, Users } from "lucide-react";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Pricing · Restrolytics" },
      {
        name: "description",
        content:
          "Restrolytics packages from $199 per location each month: team workspace, virtual manager support and marketing.",
      },
      { property: "og:title", content: "Restrolytics pricing" },
      {
        property: "og:description",
        content: "Team workspace, virtual manager and marketing packages, priced per location.",
      },
    ],
    links: canonical("/pricing"),
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

function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main id="main">
        <section className="border-b">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <h1 className="text-display max-w-[16ch]">
              The support your restaurant needs, priced per location.
            </h1>
            <p className="text-lead mt-6 max-w-2xl">
              Keep your restaurant organized, your team accountable and your marketing active, so
              you can focus on growth. All prices are USD, per restaurant location, billed monthly.
            </p>
          </div>
        </section>

        <section className="bg-surface-subtle py-16 lg:py-20" aria-label="Packages">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
            {packages.map((item) => (
              <article key={item.name} className="surface flex flex-col p-6 sm:p-7">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-link">
                    <item.icon className="size-5" aria-hidden="true" />
                  </span>
                  <h2 className="font-display text-xl font-bold [font-stretch:82%]">{item.name}</h2>
                </div>
                <p className="mt-4 text-muted-foreground">{item.intro}</p>
                <p className="mt-6 flex items-baseline gap-2">
                  <span className="text-figure text-5xl">${item.price}</span>
                  <span className="text-sm text-muted-foreground">per month, per location</span>
                </p>
                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  {item.features.map((feature) => (
                    <li key={feature} className="flex gap-3">
                      <Check className="mt-0.5 size-4 shrink-0 text-link" aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 rounded-xl bg-muted px-4 py-3 text-sm">
                  <span className="font-semibold">Best for:</span> {item.bestFor}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="py-16 lg:py-24" aria-labelledby="complete-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <article className="surface-raised grid overflow-hidden lg:grid-cols-[0.95fr_1.05fr]">
              <div className="bg-primary p-7 text-primary-foreground sm:p-10 lg:p-12">
                <Badge className="bg-primary-foreground text-primary">
                  <BadgeCheck aria-hidden="true" />
                  Best value
                </Badge>
                <h2 id="complete-heading" className="text-headline mt-5">
                  Complete Package
                </h2>
                <p className="mt-3 text-primary-foreground/80">Everything above in one bundle.</p>
                <p className="mt-8 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-figure text-6xl">$999</span>
                  <span className="text-primary-foreground/80">per month, per location</span>
                </p>
                <p className="mt-3 text-sm text-primary-foreground/80">
                  Regular combined price <s>$1,118</s>. You save $119 every month.
                </p>
                <Button
                  size="lg"
                  variant="outline"
                  className="mt-8 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                  asChild
                >
                  <Link to="/contact">Talk to us about the complete package</Link>
                </Button>
              </div>
              <div className="p-7 sm:p-10 lg:p-12">
                <h3 className="font-display text-lg font-bold [font-stretch:85%]">
                  What&apos;s included
                </h3>
                <ul className="mt-5 space-y-4">
                  {completeFeatures.map((feature) => (
                    <li key={feature} className="flex gap-3">
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-soft text-link">
                        <Check className="size-3" aria-hidden="true" />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </div>
        </section>

        <section className="border-y bg-surface-subtle py-16" aria-labelledby="terms-heading">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.55fr_1.45fr] lg:px-8">
            <div>
              <h2 id="terms-heading" className="text-title">
                Clear coverage, no surprises
              </h2>
              <p className="mt-4 text-sm text-muted-foreground">
                Virtual manager support follows an agreed schedule. All remote operations work and
                camera checks share the included 20 hours each week.
              </p>
            </div>
            <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {[
                "Monthly billing, per restaurant location",
                "Up to four compatible cameras, checked twice each weekday",
                "Continuous camera monitoring requires a separate quote",
                "Additional manager hours are $5.99/hour with advance approval",
                "Advertising spend, SMS usage, equipment and third-party subscriptions are separate",
                "Your store team remains responsible for on-site restaurant management",
              ].map((term) => (
                <li key={term} className="flex gap-3 border-t pt-4 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-link" aria-hidden="true" />
                  <span>{term}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-ink py-16 text-ink-foreground">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-4 sm:px-6 md:flex-row md:items-center lg:px-8">
            <div className="max-w-2xl">
              <h2 className="text-headline">
                Your team runs the restaurant. We keep the details moving.
              </h2>
              <p className="mt-3 text-ink-muted">
                Tell us about your location and we&apos;ll help you choose the right level of
                support.
              </p>
            </div>
            <Button size="lg" variant="highlight" className="shrink-0" asChild>
              <Link to="/contact">Book a walkthrough</Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
