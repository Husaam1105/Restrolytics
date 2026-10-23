import { useState, type FormEvent } from "react";
import { canonical } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone } from "lucide-react";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const EMAIL = "hello@restrolytics.com";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Book a walkthrough · Restrolytics" },
      {
        name: "description",
        content:
          "Book a 30-minute Restrolytics walkthrough. Bring last week's Toast export and see your own numbers.",
      },
    ],
    links: canonical("/contact"),
  }),
});

function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    restaurant: "",
    email: "",
    phone: "",
    locations: "1",
    message: "",
  });
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm({ ...form, [key]: e.target.value });

  // No email service is wired up yet, so this opens the visitor's mail app with everything filled in.
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body = [
      `Name: ${form.name}`,
      `Restaurant: ${form.restaurant}`,
      `Locations: ${form.locations}`,
      `Email: ${form.email}`,
      form.phone ? `Phone: ${form.phone}` : "",
      "",
      form.message,
    ]
      .filter((line, i) => line || i === 5)
      .join("\n");
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(`Walkthrough for ${form.restaurant || "my restaurant"}`)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader tone="paper" />
      <main
        id="main"
        className="mx-auto grid max-w-7xl gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-24"
      >
        <div className="max-w-md">
          <h1 className="text-headline">Book a walkthrough</h1>
          <p className="text-lead mt-5">
            Thirty minutes on a call. Bring last week's Toast export if you have it and we'll load
            it while you watch, so you see your own numbers instead of a demo.
          </p>
          <dl className="mt-10 space-y-5">
            <div className="flex gap-3">
              <Mail className="mt-0.5 size-5 text-link" aria-hidden="true" />
              <div>
                <dt className="text-sm text-muted-foreground">Email</dt>
                <dd>
                  <a
                    href={`mailto:${EMAIL}`}
                    className="font-semibold underline-offset-4 hover:underline"
                  >
                    {EMAIL}
                  </a>
                </dd>
              </div>
            </div>
            <div className="flex gap-3">
              <Phone className="mt-0.5 size-5 text-link" aria-hidden="true" />
              <div>
                <dt className="text-sm text-muted-foreground">Already a customer?</dt>
                <dd>Message your Restrolytics manager from IQ Copilot in the app.</dd>
              </div>
            </div>
          </dl>
        </div>

        <form onSubmit={submit} className="surface-raised space-y-5 p-6 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                required
                autoComplete="name"
                value={form.name}
                onChange={set("name")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="restaurant">Restaurant</Label>
              <Input
                id="restaurant"
                required
                autoComplete="organization"
                value={form.restaurant}
                onChange={set("restaurant")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={set("email")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={set("phone")}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="locations">Number of locations</Label>
            <Input
              id="locations"
              type="number"
              min={1}
              max={500}
              inputMode="numeric"
              value={form.locations}
              onChange={set("locations")}
              className="max-w-32"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">What would you like to fix first?</Label>
            <Textarea
              id="message"
              rows={4}
              value={form.message}
              onChange={set("message")}
              placeholder="e.g. labor creeping up, delivery fees, or staff missing closing checklists"
            />
          </div>
          <Button type="submit" size="lg" className="w-full sm:w-auto">
            Send request
          </Button>
          <p className="text-xs text-muted-foreground">
            This opens your email app with the details filled in.
          </p>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
