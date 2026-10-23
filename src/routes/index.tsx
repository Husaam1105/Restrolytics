import { createFileRoute } from "@tanstack/react-router";

import { absoluteUrl, canonical } from "@/lib/seo";

import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import {
  ClosingCta,
  Faq,
  Hero,
  IqSection,
  ManagerSection,
  Operations,
  Sources,
} from "@/components/marketing/landing";

const TITLE = "Restrolytics: restaurant sales, stock, shifts and payroll in one place";
const DESCRIPTION =
  "Bring Toast and delivery-app sales, labor, inventory counts and checklists together, and ask IQ what to fix for tomorrow.";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "The whole night, added up before you lock the door" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: absoluteUrl("/") },
    ],
    links: canonical("/"),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "Restrolytics",
              url: absoluteUrl("/"),
              email: "hello@restrolytics.com",
            },
            {
              "@type": "SoftwareApplication",
              name: "Restrolytics",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              description: DESCRIPTION,
              offers: {
                "@type": "Offer",
                price: "199",
                priceCurrency: "USD",
                description: "Per location, per month",
              },
            },
          ],
        }),
      },
    ],
  }),
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main id="main">
        <Hero />
        <Sources />
        <Operations />
        <IqSection />
        <ManagerSection />
        <Faq />
        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  );
}
