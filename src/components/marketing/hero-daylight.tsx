import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { DayReportPreview } from "./landing";

/**
 * Direction A ("Daylight"): a light-led hero whose key visual is the product
 * itself, an end-of-day report with IQ's answer beside it.
 */
export function HeroDaylight() {
  return (
    <section className="relative overflow-hidden border-b bg-background">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 pt-14 pb-20 sm:px-6 sm:pt-20 lg:grid-cols-[1fr_1.05fr] lg:px-8 lg:pt-24 lg:pb-28">
        <div className="max-w-xl">
          <h1 className="text-display text-foreground">The whole night, added up before you lock the door.</h1>
          <p className="text-lead mt-7 max-w-md">
            Restrolytics brings your Toast and delivery-app sales, labor, stock counts and checklists into one place. IQ, the
            built-in copilot, reads all of it and tells you what to fix for tomorrow.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link to="/contact">Book a walkthrough</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/pricing">See pricing</Link>
            </Button>
          </div>
        </div>

        <div className="relative pb-16 lg:pb-10">
          <DayReportPreview />
          <figure
            aria-label="Example IQ answer"
            className="surface-raised absolute right-0 -bottom-2 w-[min(22rem,88%)] p-4 sm:-right-4 lg:-right-8"
          >
            <p className="ml-auto w-fit rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground">
              What should I fix for tomorrow?
            </p>
            <p className="mt-3 rounded-2xl rounded-bl-md bg-muted px-3.5 py-2.5 text-sm">
              Garlic fries were 86'd on Uber Eats from 8:40. Add a case to Friday's order, and move one close shift to 5 PM.
            </p>
            <figcaption className="mt-2 text-xs text-muted-foreground">Example answer from IQ</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
