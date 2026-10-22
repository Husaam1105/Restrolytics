import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, BrainCircuit, Check, ChefHat, Clock3, Megaphone, PackageCheck, ShieldCheck, Sparkles, TrendingUp, Users } from "lucide-react";

import restaurantTeam from "@/assets/restrolytics-team.jpg";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "Restrolytics — Restaurant operations, all in one place" },
      { name: "description", content: "Connect sales, labor, inventory, and marketing data to understand profit and receive clear AI recommendations." },
      { property: "og:title", content: "Restrolytics — Run every service with clarity" },
      { property: "og:description", content: "Know your sales, control your costs, and grow your restaurant profit with connected analytics and AI insights." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const features = [
  { icon: BarChart3, title: "Sales analytics", text: "Sales by hour, day, menu item, category, location, service type, average ticket, discounts, and refunds." },
  { icon: Clock3, title: "Labor analytics", text: "Labor percentage, sales per labor hour, scheduling, overtime, staffing forecasts, and target alerts." },
  { icon: PackageCheck, title: "Inventory & food cost", text: "Theoretical versus actual inventory, recipe costing, waste, vendor pricing, COGS, low stock, and purchasing recommendations." },
  { icon: Megaphone, title: "Marketing analytics", text: "Connect Google, Meta, email, SMS, and promotions to measure acquisition cost, ROAS, revenue, and campaign profit." },
];

const profitFlow = [
  { label: "Sales", icon: BarChart3 },
  { label: "Labor", icon: Clock3 },
  { label: "Inventory", icon: PackageCheck },
  { label: "Marketing", icon: Megaphone },
];

function BrandMark() {
  return <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm"><ChefHat className="size-5" /></span>;
}

function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="absolute inset-x-0 top-0 z-20 border-b border-primary-foreground/15 bg-foreground/25 backdrop-blur-md">
        <div className="mx-auto grid h-18 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 sm:px-5 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-3 text-primary-foreground"><BrandMark /><span className="truncate font-display text-base font-semibold min-[360px]:text-lg">Restrolytics</span></Link>
          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            <a href="#platform" className="text-sm font-medium text-primary-foreground/75 transition-colors hover:text-primary-foreground">Platform</a>
            <a href="#operations" className="text-sm font-medium text-primary-foreground/75 transition-colors hover:text-primary-foreground">Operations</a>
            <a href="#integrations" className="text-sm font-medium text-primary-foreground/75 transition-colors hover:text-primary-foreground">Integrations</a>
            <Link to="/pricing" className="text-sm font-medium text-primary-foreground/75 transition-colors hover:text-primary-foreground">Pricing</Link>
          </nav>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" className="hidden text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground sm:inline-flex" asChild><Link to="/auth">Sign in</Link></Button>
            <Button className="bg-primary-foreground text-primary hover:bg-primary-foreground/90" asChild><Link to="/signup">Request access <ArrowRight className="size-4" /></Link></Button>
          </div>
        </div>
      </header>

       <section className="relative flex min-h-[92svh] items-end overflow-hidden bg-foreground">
         <img src={restaurantTeam} alt="Restaurant manager reviewing service with the kitchen team" width={1600} height={1000} className="absolute inset-0 h-full w-full object-cover object-[58%_center] sm:object-center" />
         <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--hero-overlay)_0%,var(--hero-overlay-soft)_75%,transparent_100%)] sm:bg-[linear-gradient(90deg,var(--hero-overlay)_0%,var(--hero-overlay-soft)_58%,transparent_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,var(--hero-overlay)_0%,transparent_55%)]" />
         <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-16 pt-28 sm:pb-18 sm:pt-32 lg:px-8 lg:pb-24">
          <div className="max-w-3xl">
             <div className="mb-6 inline-flex max-w-full items-center gap-2 border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1.5 text-xs font-semibold text-primary-foreground backdrop-blur-md"><Sparkles className="size-3.5 shrink-0 text-brand-bright" /><span className="truncate">Built for the rhythm of restaurant service</span></div>
             <h1 className="font-display text-4xl font-semibold leading-[1.04] text-primary-foreground min-[360px]:text-5xl sm:text-6xl lg:text-7xl">Restrolytics</h1>
            <p className="mt-5 max-w-2xl font-display text-xl font-medium leading-8 text-primary-foreground/90 sm:text-2xl">Know Your Sales. Control Your Costs. Grow Your Profit.</p>
            <p className="mt-3 max-w-2xl text-base leading-7 text-primary-foreground/70 sm:text-lg">Connect operational and marketing data to see what is actually making—or losing—money.</p>
             <div className="mt-9 grid max-w-sm gap-3 sm:flex sm:max-w-none sm:flex-wrap">
               <Button size="lg" className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 sm:w-auto" asChild><Link to="/signup">Request access <ArrowRight className="size-4" /></Link></Button>
               <Button size="lg" variant="outline" className="w-full border-primary-foreground/35 bg-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground sm:w-auto" asChild><Link to="/auth">Open your workspace</Link></Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b bg-background py-14">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-center text-xs font-semibold text-primary">THE RESTROLYTICS PROFIT ENGINE</p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 md:flex-row md:items-center">
            <div className="grid flex-1 grid-cols-2 border-l border-t sm:grid-cols-4">
              {profitFlow.map((item) => (
                <div key={item.label} className="flex items-center justify-center gap-2 border-b border-r bg-card px-4 py-5 text-sm font-semibold">
                  <item.icon className="size-4 text-primary" /> {item.label}
                </div>
              ))}
            </div>
            <ArrowRight className="mx-auto size-5 rotate-90 text-muted-foreground md:mx-2 md:rotate-0" />
            <div className="flex items-center justify-center gap-2 rounded-md bg-primary px-7 py-5 font-display text-sm font-semibold text-primary-foreground">
              <TrendingUp className="size-4" /> Profit
            </div>
            <ArrowRight className="mx-auto size-5 rotate-90 text-muted-foreground md:mx-2 md:rotate-0" />
            <div className="flex items-center justify-center gap-2 rounded-md border border-primary bg-brand-soft px-7 py-5 font-display text-sm font-semibold text-primary">
              <BrainCircuit className="size-4" /> AI recommendations
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="border-b bg-surface-subtle py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold text-primary">THE DAILY VIEW</p>
              <h2 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-4xl">Know what happened before you leave the floor.</h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">Revenue by channel, labor cost, mistakes, low stock, and who worked—organized around the day your restaurant actually had.</p>
              <ul className="mt-7 space-y-3">
                {["One view across every location", "Clear roles for owners, managers, and staff", "A complete trail from shift to payout"].map((item) => <li key={item} className="flex items-center gap-3 text-sm font-medium"><span className="flex size-5 items-center justify-center rounded-full bg-brand-soft text-primary"><Check className="size-3" /></span>{item}</li>)}
              </ul>
            </div>
            <DashboardPreview />
          </div>
        </div>
      </section>

      <section id="operations" className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="max-w-2xl"><p className="text-sm font-semibold text-primary">ONE OPERATING SYSTEM</p><h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">Built around how restaurant teams work.</h2></div>
          <div className="mt-12 grid border-l border-t sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => <article key={feature.title} className="border-b border-r p-7 lg:min-h-64"><feature.icon className="size-7 text-primary" /><h3 className="mt-10 font-display text-lg font-semibold">{feature.title}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{feature.text}</p></article>)}
          </div>
        </div>
      </section>

      <section className="border-y bg-foreground py-20 text-primary-foreground lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[0.72fr_1.28fr] lg:px-8">
          <div>
            <div className="flex size-11 items-center justify-center rounded-md bg-brand-bright text-foreground"><BrainCircuit className="size-6" /></div>
            <p className="mt-7 text-sm font-semibold text-brand-bright">AI INSIGHTS</p>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-4xl">Not another dashboard. A clearer next move.</h2>
            <p className="mt-5 text-base leading-7 text-primary-foreground/70">Restrolytics connects operations and marketing to explain what changed, what affected profit, and what the owner should do next.</p>
          </div>
          <div className="space-y-4">
            <InsightQuote label="Campaign profitability" text="Instagram campaign generated $3,850 in sales from $600 spend, but after discounts, food cost and ad spend, estimated contribution was $1,420." />
            <InsightQuote label="Promotion optimization" text="Your 20% Tuesday promotion increased orders 31%, but profit increased only 8%. A 10–15% offer may produce a better margin." />
          </div>
        </div>
      </section>

      <section id="integrations" className="bg-primary py-16 text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-10 px-5 lg:flex-row lg:items-center lg:px-8">
          <div className="max-w-2xl"><p className="text-sm font-semibold text-brand-bright">CONNECTED OPERATIONS</p><h2 className="mt-3 font-display text-3xl font-semibold">Bring the systems you already use into one clear picture.</h2><p className="mt-4 text-primary-foreground/70">Toast POS · Uber Eats · DoorDash · Grubhub · vendor orders · invoice capture</p></div>
          <Button size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90" asChild><Link to="/signup">Request access <ArrowRight className="size-4" /></Link></Button>
        </div>
      </section>

      <section className="border-b bg-background py-16 lg:py-20">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-5 md:flex-row md:items-center lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-coral">PLANS FOR EVERY STAGE</p>
            <h2 className="mt-3 font-display text-3xl font-semibold">Software, hands-on management, and marketing support.</h2>
            <p className="mt-4 leading-7 text-muted-foreground">Start with the team workspace or add a virtual manager and a complete monthly marketing program.</p>
          </div>
          <Button size="lg" variant="outline" className="shrink-0" asChild><Link to="/pricing">View packages <ArrowRight className="size-4" /></Link></Button>
        </div>
      </section>

      <footer className="border-t py-8"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 sm:flex-row sm:items-center sm:justify-between lg:px-8"><div className="flex items-center gap-3"><BrandMark /><span className="font-display font-semibold">Restrolytics</span></div><div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground"><span className="flex items-center gap-1.5"><ShieldCheck className="size-4" /> Role-based access</span><span className="flex items-center gap-1.5"><Users className="size-4" /> Multi-location ready</span></div></div></footer>
    </main>
  );
}

function DashboardPreview() {
  const rows = [["Toast POS", "$3,842", "64%"], ["Uber Eats", "$1,204", "20%"], ["DoorDash", "$728", "12%"], ["Catering", "$246", "4%"]];
  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-[var(--shadow-premium)]">
      <div className="flex items-center justify-between border-b px-5 py-4"><div><p className="font-display text-sm font-semibold">Kaizr · Today</p><p className="text-xs text-muted-foreground">Live operations summary</p></div><span className="flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success"><span className="size-1.5 rounded-full bg-success" />Live</span></div>
      <div className="grid grid-cols-3 border-b">{[["Revenue", "$6,020"], ["Labor", "18.4%"], ["On shift", "9"]].map(([label, value]) => <div key={label} className="min-w-0 border-r p-3 last:border-r-0 sm:p-4"><p className="truncate text-[11px] text-muted-foreground">{label}</p><p className="mt-1 truncate font-display text-lg font-semibold sm:text-xl">{value}</p></div>)}</div>
      <div className="grid md:grid-cols-[1.15fr_0.85fr]">
        <div className="border-b p-5 md:border-b-0 md:border-r"><div className="mb-5 flex items-center justify-between"><p className="text-sm font-semibold">Sales by channel</p><p className="text-xs text-success">+8.2%</p></div><div className="space-y-4">{rows.map(([name, amount, share], index) => <div key={name}><div className="flex justify-between text-xs"><span>{name}</span><span className="font-semibold">{amount}</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: share, opacity: 1 - index * 0.14 }} /></div></div>)}</div></div>
        <div className="p-5"><p className="text-sm font-semibold">Needs attention</p><div className="mt-4 space-y-3 text-xs"><div className="border-l-2 border-warning pl-3"><p className="font-medium">3 inventory items low</p><p className="mt-0.5 text-muted-foreground">Order before Friday</p></div><div className="border-l-2 border-primary pl-3"><p className="font-medium">Closing checklist</p><p className="mt-0.5 text-muted-foreground">6 of 8 complete</p></div><div className="border-l-2 border-success pl-3"><p className="font-medium">Payroll ready</p><p className="mt-0.5 text-muted-foreground">42.5 hours approved</p></div></div></div>
      </div>
    </div>
  );
}

function InsightQuote({ label, text }: { label: string; text: string }) {
  return (
    <article className="border border-primary-foreground/15 bg-primary-foreground/5 p-6 backdrop-blur-sm sm:p-7">
       <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <p className="text-xs font-semibold text-brand-bright">{label}</p>
         <span className="w-fit rounded-full border border-primary-foreground/15 px-2.5 py-1 text-[11px] text-primary-foreground/60">Recommended action</span>
      </div>
      <p className="mt-5 font-display text-lg leading-8 text-primary-foreground">“{text}”</p>
    </article>
  );
}