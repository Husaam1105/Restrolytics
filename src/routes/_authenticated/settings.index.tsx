import { Link, createFileRoute } from "@tanstack/react-router";
import { IdCard, Plug, Users } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/settings/")({
  component: SettingsHome,
  head: () => ({
    meta: [
      { title: "Settings — Restaurant CRM" },
      {
        name: "description",
        content: "Manage employees, who can sign in, and the accounts your restaurant connects to.",
      },
      { property: "og:title", content: "Settings — Restaurant CRM" },
      {
        property: "og:description",
        content: "Employees, access and connected accounts in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const items = [
  {
    to: "/settings/access",
    icon: Users,
    title: "Employees & access",
    description: "Invite people, set owner, manager or staff, and remove access.",
  },
  {
    to: "/employees",
    icon: IdCard,
    title: "Employee records",
    description: "Names, roles, hourly rates, tips and how each person is paid.",
  },
  {
    to: "/settings/integrations",
    icon: Plug,
    title: "Integrations",
    description: "Connect Toast POS, Uber Eats, DoorDash and Grubhub.",
  },
];

function SettingsHome() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Everything about people and connected accounts for this restaurant.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <Link key={item.to} to={item.to} className="block">
            <Card className="h-full transition-colors hover:bg-accent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
