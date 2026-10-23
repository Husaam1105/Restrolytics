import { Link } from "@tanstack/react-router";
import {
  BrainCircuit,
  Camera,
  ClipboardCheck,
  FileSpreadsheet,
  Headset,
  LockKeyhole,
  PackageCheck,
  Receipt,
  ScanLine,
  Truck,
  UsersRound,
  Wallet,
} from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { TicketRail } from "./ticket-rail";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-ink text-ink-foreground">
      <div className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 sm:pt-20 lg:px-8 lg:pt-24">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-end">
          <h1 className="text-display max-w-[14ch]">The whole night, added up before you lock the door.</h1>
          <div className="max-w-md space-y-7 lg:pb-2">
            <p className="text-lg leading-relaxed text-ink-muted">
              Restrolytics brings your Toast and delivery-app sales, labor, stock counts and checklists into one place.
              IQ, the built-in copilot, reads all of it and tells you what to fix for tomorrow.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" variant="highlight" asChild>
                <Link to="/contact">Book a walkthrough</Link>
              </Button>
              <Button
                size="lg"
                variant="ghost"
                asChild
                className="text-ink-foreground shadow-[0_0_0_1px_oklch(1_0_0/0.18)] hover:bg-white/10 hover:text-ink-foreground"
              >
                <Link to="/pricing">See pricing</Link>
              </Button>
            </div>
          </div>
        </div>

        <TicketRail className="mt-16 sm:mt-20" />
        <p className="pb-6 text-xs text-ink-muted">Example evening. Yours will have your own tickets and totals.</p>
      </div>
    </section>
  );
}

const SOURCES = [
  { icon: Receipt, name: "Toast POS", detail: "Sales summary, product mix and removed-item exports" },
  { icon: FileSpreadsheet, name: "Uber Eats", detail: "Payment, payout, order-error and ratings reports" },
  { icon: FileSpreadsheet, name: "DoorDash and Grubhub", detail: "Orders entered today, report import on the way" },
  { icon: Truck, name: "Vendor portals", detail: "Order history pulled from supplier websites" },
  { icon: ScanLine, name: "Invoice photos", detail: "Snap a delivery invoice; IQ reads the line items" },
  { icon: Camera, name: "Your team", detail: "Clock-ins, checklist ticks and photo proof from the floor" },
];

export function Sources() {
  return (
    <section id="product" className="scroll-mt-20 border-b bg-background py-20 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div className="max-w-md">
          <h2 className="text-headline">Your numbers already exist. They're just in six places.</h2>
          <p className="text-lead mt-5">
            Restrolytics pulls them together and sorts everything by your business day, so a shift that closes at 1 AM still
            counts as Friday.
          </p>
        </div>
        <dl className="grid gap-x-10 sm:grid-cols-2">
          {SOURCES.map(({ icon: Icon, name, detail }) => (
            <div key={name} className="flex gap-4 border-t py-5">
              <Icon className="mt-0.5 size-5 shrink-0 text-link" aria-hidden="true" />
              <div>
                <dt className="font-semibold">{name}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{detail}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function DayReportPreview() {
  const channels = [
    ["Toast POS", 3842, 64],
    ["Uber Eats", 1204, 20],
    ["DoorDash", 728, 12],
    ["Catering", 246, 4],
  ] as const;
  return (
    <figure className="surface-raised overflow-hidden" aria-label="Example end-of-day report">
      <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
        <div>
          <p className="font-display text-base font-bold [font-stretch:82%]">Friday, close-out</p>
          <p className="text-xs text-muted-foreground">Main Street Kitchen</p>
        </div>
        <span className="rounded-md bg-success-soft px-2 py-1 text-xs font-semibold text-success">Checklists done</span>
      </div>
      <div className="grid grid-cols-3 divide-x border-b">
        {[
          ["Net sales", "$5,312"],
          ["Labor", "18.4%"],
          ["Refunds", "$42"],
        ].map(([label, value]) => (
          <div key={label} className="p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-figure mt-1 text-2xl">{value}</p>
          </div>
        ))}
      </div>
      <div className="space-y-3.5 p-5">
        {channels.map(([name, amount, share]) => (
          <div key={name}>
            <div className="flex justify-between text-sm">
              <span>{name}</span>
              <span className="font-semibold tabular-nums">${amount.toLocaleString("en-US")}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-chart-1" style={{ width: `${share}%` }} />
            </div>
          </div>
        ))}
      </div>
      <figcaption className="border-t bg-muted/50 px-5 py-3 text-xs text-muted-foreground">Example data</figcaption>
    </figure>
  );
}

const AREAS = [
  {
    icon: Receipt,
    title: "End-of-day report",
    text: "Sales by channel, refunds and voids, who worked and what it cost, and the tip pool, for any day or date range.",
  },
  {
    icon: PackageCheck,
    title: "Inventory and vendors",
    text: "Count each storage area on your phone, see what's below par, and know when each vendor's next order is due.",
  },
  {
    icon: ClipboardCheck,
    title: "Shifts and checklists",
    text: "Opening and closing lists for the floor and the kitchen, with temperatures, notes and photo proof.",
  },
  {
    icon: Wallet,
    title: "Timeclock and payroll",
    text: "Staff clock in from their phone. Tips split by hours worked, and each person confirms when they've been paid.",
  },
];

export function Operations() {
  return (
    <section className="border-b bg-surface-subtle py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-14 lg:grid-cols-[1fr_1.05fr]">
          <div>
            <h2 className="text-headline max-w-lg">Know what happened before you leave the floor.</h2>
            <dl className="mt-10 space-y-8">
              {AREAS.map(({ icon: Icon, title, text }) => (
                <div key={title} className="grid grid-cols-[2.5rem_1fr] gap-4">
                  <span className="grid size-10 place-items-center rounded-xl bg-card text-link shadow-[var(--shadow-ring),var(--shadow-xs)]">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <dt className="font-display text-lg font-bold [font-stretch:85%]">{title}</dt>
                    <dd className="mt-1 max-w-md text-muted-foreground">{text}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
          <div className="lg:sticky lg:top-24">
            <DayReportPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

export function IqSection() {
  return (
    <section id="iq" className="scroll-mt-16 bg-ink py-20 text-ink-foreground lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
        <div className="max-w-lg">
          <BrainCircuit className="size-8 text-highlight" aria-hidden="true" />
          <h2 className="text-headline mt-6">Ask IQ the question you'd ask your best GM.</h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-muted">
            IQ answers from your restaurant's own sales, schedule, stock and payroll. If something isn't in your data, it says
            so and tells you where to add it.
          </p>
          <ul className="mt-8 space-y-3 text-ink-foreground">
            <li className="flex gap-3">
              <LockKeyhole className="mt-0.5 size-5 shrink-0 text-highlight" aria-hidden="true" />
              Staff only ever see their own hours, pay and tasks.
            </li>
            <li className="flex gap-3">
              <UsersRound className="mt-0.5 size-5 shrink-0 text-highlight" aria-hidden="true" />
              Each restaurant's data stays separate, down to the database.
            </li>
          </ul>
        </div>

        <figure className="rounded-3xl bg-white/[0.04] p-3 shadow-[0_0_0_1px_oklch(1_0_0/0.08)]">
          <div className="space-y-4 rounded-2xl bg-card p-5 text-card-foreground sm:p-6">
            <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground">
              Why was labor so high on Tuesday?
            </p>
            <div className="max-w-[92%] space-y-3 rounded-2xl rounded-bl-md bg-muted px-4 py-3">
              <p>
                Labor was <strong>31% of sales</strong> on Tuesday, against 19% on a normal Tuesday. Four people were on the
                line from 2 to 5 PM while sales in that window were $410.
              </p>
              <p>Next steps:</p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>Start one closing shift at 5 PM instead of 2 PM.</li>
                <li>Move prep for Wednesday into the 3 PM lull.</li>
              </ol>
            </div>
          </div>
          <figcaption className="px-3 pt-3 text-xs text-ink-muted">Example conversation</figcaption>
        </figure>
      </div>
    </section>
  );
}

export function ManagerSection() {
  return (
    <section className="border-b bg-background py-20 lg:py-24">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex max-w-2xl gap-5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-link">
            <Headset className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-title">Want a person on it, too?</h2>
            <p className="mt-3 text-muted-foreground">
              On the Virtual Manager plan, a Restrolytics manager works inside your account 20 hours a week: chasing missing
              invoices, following up on checklists, and sending you a weekly summary. You talk to them in the app.
            </p>
          </div>
        </div>
        <Button size="lg" variant="outline" asChild className="shrink-0">
          <Link to="/pricing">Compare plans</Link>
        </Button>
      </div>
    </section>
  );
}

const FAQ = [
  {
    q: "Which POS systems do you work with?",
    a: "Toast today. You upload Toast's sales summary, product mix and removed-items exports and Restrolytics does the rest. A direct Toast connection is in progress.",
  },
  {
    q: "What about delivery apps?",
    a: "Uber Eats payment, payout, error and ratings reports import directly, including fees and promotions per order. DoorDash and Grubhub report imports are next.",
  },
  {
    q: "My staff don't have work email addresses. Can they still sign in?",
    a: "Yes. A manager creates a username and password for each person from the Employees page. Staff use those to clock in, see their schedule and confirm their pay.",
  },
  {
    q: "Who can see sales and pay?",
    a: "Owners and managers see sales, costs and everyone's pay. Staff see only their own hours, pay, schedule and tasks. That rule is enforced in the database, not just hidden in the app.",
  },
  {
    q: "Do I have to sign a long contract?",
    a: "No. Plans are billed monthly per location. Book a walkthrough and we'll set up your first restaurant with you.",
  },
];

export function Faq() {
  return (
    <section className="bg-background py-20 lg:py-28">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <h2 className="text-headline max-w-sm">Questions owners ask us</h2>
        <Accordion type="single" collapsible className="w-full">
          {FAQ.map((item) => (
            <AccordionItem key={item.q} value={item.q}>
              <AccordionTrigger className="py-5 text-left text-base font-semibold hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-base text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

export function ClosingCta() {
  return (
    <section className="bg-primary py-16 text-primary-foreground lg:py-20">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="max-w-xl">
          <h2 className="text-headline">See your own restaurant in it.</h2>
          <p className="mt-4 text-primary-foreground/75">
            Thirty minutes on a call. Bring last week's Toast export and we'll load it while you watch.
          </p>
        </div>
        <Button size="lg" variant="highlight" asChild className="shrink-0">
          <Link to="/contact">Book a walkthrough</Link>
        </Button>
      </div>
    </section>
  );
}
