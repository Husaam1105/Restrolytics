import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CalendarCheck, Info, Loader2 } from "lucide-react";

import iqLogo from "@/assets/iq-copilot.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThreadList, useNewThread } from "@/components/copilot/thread-list";
import { getCopilotAlerts } from "@/lib/copilot.functions";

export const Route = createFileRoute("/_authenticated/copilot/")({
  head: () => ({
    meta: [
      { title: "IQ Copilot · Restrolytics" },
      { name: "description", content: "Your virtual restaurant manager: daily briefing, alerts and answers from your own data." },
    ],
  }),
  component: CopilotHome,
});

const STAFF_QUESTIONS = [
  "How many hours did I work in the last two weeks?",
  "When is my next shift?",
  "Which of my tasks are still open today?",
];
const MANAGER_QUESTIONS = [
  "How much did we make last week, by channel?",
  "What are Uber Eats fees costing us?",
  "Who worked the most hours this week?",
  "What should I order this week?",
];

function CopilotHome() {
  const fetchAlerts = useServerFn(getCopilotAlerts);
  const newThread = useNewThread();
  const { data, isLoading } = useQuery({ queryKey: ["copilot-alerts"], queryFn: () => fetchAlerts() });
  const isStaff = data?.role === "staff";
  const questions = isStaff ? STAFF_QUESTIONS : MANAGER_QUESTIONS;
  const ask = (q: string) => newThread.mutate(q);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <img src={iqLogo} alt="IQ" className="h-14 w-14 rounded-lg border bg-card p-1" />
          <div>
            <h1 className="text-2xl font-semibold">IQ Copilot</h1>
            <p className="text-sm text-muted-foreground">
              Your virtual manager{data?.restaurant ? ` for ${data.restaurant}` : ""}. Ask anything about your sales,
              staff, inventory and tasks.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="text-base">Restrolytics Manager (live)</CardTitle>
              <CardDescription>Chat with a real manager, see assigned tasks and log notes for review.</CardDescription>
            </div>
            <Button asChild variant="outline">
              <Link to="/copilot/manager">Open</Link>
            </Button>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="text-base">Daily briefing</CardTitle>
              <CardDescription>
                {isStaff
                  ? "Your shifts, hours and open tasks for today."
                  : "Yesterday's sales, errors, labor, 86'd items, low stock and today's schedule."}
              </CardDescription>
            </div>
            <Button
              onClick={() =>
                ask(isStaff ? "Give me my briefing for today: my shift, hours and open tasks." : "Give me today's manager briefing.")
              }
              disabled={newThread.isPending}
            >
              <CalendarCheck className="mr-2 h-4 w-4" /> Get briefing
            </Button>
          </CardHeader>
        </Card>

        {!isStaff ? (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">Alerts & suggestions</h2>
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : data?.alerts.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {data.alerts.map((a) => (
                  <Card key={a.title}>
                    <CardContent className="flex h-full flex-col gap-3 p-4">
                      <div className="flex items-start gap-2">
                        {a.level === "warning" ? (
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        ) : (
                          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        )}
                        <div>
                          <p className="font-medium">{a.title}</p>
                          <p className="text-sm text-muted-foreground">{a.detail}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="mt-auto self-start" onClick={() => ask(a.ask)} disabled={newThread.isPending}>
                        Ask IQ what to do
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing needs your attention right now.</p>
            )}
          </div>
        ) : null}

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Try asking</h2>
          <div className="flex flex-wrap gap-2">
            {questions.map((q) => (
              <Button key={q} size="sm" variant="secondary" className="font-normal" onClick={() => ask(q)} disabled={newThread.isPending}>
                {q}
              </Button>
            ))}
          </div>
        </div>
      </div>
      <aside className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Your chats</h2>
        <ThreadList />
      </aside>
    </div>
  );
}
