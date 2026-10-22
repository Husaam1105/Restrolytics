import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/marketing")({
  component: MarketingPage,
  head: () => ({
    meta: [
      { title: "Marketing — Restaurant CRM" },
      { name: "description", content: "Marketing campaigns and customer outreach." },
      { property: "og:title", content: "Marketing — Restaurant CRM" },
      { property: "og:description", content: "Marketing campaigns and customer outreach." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function MarketingPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Marketing</h1>
        <p className="text-sm text-muted-foreground">Plan promotions, track campaigns, and engage customers.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
          <CardDescription>Marketing tools are coming soon.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This page will let you create promotions, email campaigns, and loyalty programs.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
