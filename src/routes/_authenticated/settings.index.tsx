import { Link, createFileRoute } from "@tanstack/react-router";
import { IdCard, Plug, Users } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireManagerRoute } from "@/lib/workspace";
import { PageContainer, PageHeader } from "@/components/page";

export const Route = createFileRoute("/_authenticated/settings/")({
  beforeLoad: requireManagerRoute,
  component: SettingsHome,
  head: () => ({
    meta: [
      { title: "Settings · Restrolytics" },
      {
        name: "description",
        content: "Manage employees, who can sign in, and the accounts your restaurant connects to.",
      },
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
    <PageContainer size="narrow">
      <PageHeader title="Settings" description={<>Everything about people and connected accounts for this restaurant.</>} />

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
    </PageContainer>
  );
}
