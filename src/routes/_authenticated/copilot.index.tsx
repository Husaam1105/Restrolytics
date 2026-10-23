import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CalendarCheck, Headset, Info } from "lucide-react";

import iqLogo from "@/assets/iq-copilot.png";
import { ThreadList, useNewThread } from "@/components/copilot/thread-list";
import { PageContainer, PageHeader, SectionHeader } from "@/components/page";
import { ErrorState, LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { getCopilotAlerts } from "@/lib/copilot.functions";

export const Route = createFileRoute("/_authenticated/copilot/")({
  head: () => ({
    meta: [
      { title: "IQ Copilot · Restrolytics" },
      {
        name: "description",
        content: "Daily briefing, alerts and answers from your own restaurant data.",
      },
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
  const query = useQuery({ queryKey: ["copilot-alerts"], queryFn: () => fetchAlerts() });
  const data = query.data;
  const isStaff = data?.role === "staff";
  const aiReady = data?.aiReady ?? true;
  const questions = isStaff ? STAFF_QUESTIONS : MANAGER_QUESTIONS;
  const ask = (q: string) => newThread.mutate(q);
  const asking = newThread.isPending || !aiReady;

  return (
    <PageContainer>
      <PageHeader
        context={data?.restaurant}
        title="IQ Copilot"
        description="Ask about your sales, staff, stock and tasks. IQ answers from your own data and says when something isn't there."
      />

      {!aiReady ? (
        <div role="status" className="flex gap-3 rounded-2xl bg-warning-soft px-5 py-4 text-sm">
          <Info
            className="mt-0.5 size-5 shrink-0 text-warning-foreground dark:text-warning"
            aria-hidden="true"
          />
          <p>
            <span className="font-semibold">IQ isn&apos;t switched on for this workspace yet.</span>{" "}
            Your Restrolytics manager can still help in the meantime.
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <section className="surface flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
            <img src={iqLogo} alt="" className="size-14 shrink-0 rounded-xl bg-brand-soft p-1.5" />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-lg font-bold [font-stretch:85%]">Daily briefing</h2>
              <p className="text-sm text-muted-foreground">
                {isStaff
                  ? "Your shift, your hours and your open tasks for today."
                  : "Yesterday's sales, errors, labor, items that ran out, low stock and today's schedule."}
              </p>
            </div>
            <Button
              onClick={() =>
                ask(
                  isStaff
                    ? "Give me my briefing for today: my shift, hours and open tasks."
                    : "Give me today's manager briefing.",
                )
              }
              disabled={asking}
            >
              <CalendarCheck />
              Get my briefing
            </Button>
          </section>

          {!isStaff ? (
            <section className="space-y-3" aria-labelledby="alerts-heading">
              <SectionHeader title={<span id="alerts-heading">Needs your attention</span>} />
              {query.isPending ? (
                <LoadingState rows={2} />
              ) : query.isError ? (
                <ErrorState
                  title="Alerts didn't load"
                  error={query.error}
                  onRetry={() => void query.refetch()}
                />
              ) : data?.alerts.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {data.alerts.map((a) => (
                    <article key={a.title} className="surface flex flex-col gap-3 p-4">
                      <div className="flex items-start gap-2.5">
                        {a.level === "warning" ? (
                          <AlertTriangle
                            className="mt-0.5 size-4 shrink-0 text-warning-foreground dark:text-warning"
                            aria-label="Warning"
                          />
                        ) : (
                          <Info className="mt-0.5 size-4 shrink-0 text-link" aria-label="Note" />
                        )}
                        <div>
                          <h3 className="font-semibold">{a.title}</h3>
                          <p className="text-sm text-muted-foreground">{a.detail}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-auto self-start"
                        onClick={() => ask(a.ask)}
                        disabled={asking}
                      >
                        Ask IQ what to do
                      </Button>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nothing needs your attention right now.
                </p>
              )}
            </section>
          ) : null}

          <section className="space-y-3" aria-labelledby="try-heading">
            <SectionHeader title={<span id="try-heading">Try asking</span>} />
            <div className="flex flex-wrap gap-2">
              {questions.map((q) => (
                <Button
                  key={q}
                  size="sm"
                  variant="secondary"
                  className="font-normal"
                  onClick={() => ask(q)}
                  disabled={asking}
                >
                  {q}
                </Button>
              ))}
            </div>
          </section>

          <section className="surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex gap-3">
              <Headset className="mt-0.5 size-5 shrink-0 text-link" aria-hidden="true" />
              <div>
                <h2 className="font-semibold">Restrolytics manager</h2>
                <p className="text-sm text-muted-foreground">
                  Chat with a real person, see assigned tasks and log notes for review.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" className="shrink-0">
              <Link to="/copilot/manager">Open live manager</Link>
            </Button>
          </section>
        </div>

        <aside className="space-y-3" aria-label="Your chats">
          <SectionHeader title="Your chats" />
          <ThreadList />
        </aside>
      </div>
    </PageContainer>
  );
}
