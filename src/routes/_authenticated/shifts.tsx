import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StaffSchedule } from "@/components/staff-schedule";
import { TimeclockPanel } from "@/components/timeclock-panel";
import { AreaChecklists } from "@/components/area-checklists";
import { getShiftProgress, saveShiftSettings } from "@/lib/shift-tasks.functions";
import { formatTime } from "@/lib/operating-day";
import { BarChart3, CalendarDays, CheckCircle2, Clock3 } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/page";

/** Every IANA timezone the browser knows, for the service-hours picker. */
const TIMEZONES: string[] =
  typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London", "UTC"];

export const Route = createFileRoute("/_authenticated/shifts")({
  component: ShiftsPage,
  head: () => ({
    meta: [
      { title: "Shifts · Restrolytics" },
      { name: "description", content: "Service hours and daily checklist progress for your team." },
    ],
  }),
});

const groupLabels: Record<string, string> = {
  "foh-opening": "Front of house opening",
  "foh-closing": "Front of house closing",
  "boh-opening": "Kitchen opening",
  "boh-closing": "Kitchen closing",
};

function ShiftsPage() {
  const queryClient = useQueryClient();
  const fetchProgress = useServerFn(getShiftProgress);
  const saveSettings = useServerFn(saveShiftSettings);

  const { data } = useQuery({
    queryKey: ["shift-progress"],
    queryFn: () => fetchProgress(),
  });

  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [timezone, setTimezone] = useState("");

  useEffect(() => {
    if (!data) return;
    setOpenTime(data.settings.openTime);
    setCloseTime(data.settings.closeTime);
    setTimezone(data.settings.timezone);
  }, [data]);

  const save = useMutation({
    mutationFn: () => saveSettings({ data: { openTime, closeTime, timezone } }),
    onSuccess: () => {
      toast.success("Service hours saved");
      queryClient.invalidateQueries({ queryKey: ["shift-progress"] });
      queryClient.invalidateQueries({ queryKey: ["shift-checklist"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PageContainer>
      <PageHeader title="Shifts" description={<>Set your service hours and track today&apos;s checklists. Everything resets once you close for the night.</>} />

      <Tabs defaultValue="schedule" className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="h-auto min-w-max">
            <TabsTrigger value="schedule"><CalendarDays className="mr-2 size-4" />Schedule</TabsTrigger>
            <TabsTrigger value="timeclock"><Clock3 className="mr-2 size-4" />Time clock</TabsTrigger>
            <TabsTrigger value="foh"><CheckCircle2 className="mr-2 size-4" />Front of house</TabsTrigger>
            <TabsTrigger value="boh"><CheckCircle2 className="mr-2 size-4" />Kitchen staff</TabsTrigger>
            <TabsTrigger value="checklists"><BarChart3 className="mr-2 size-4" />Hours &amp; progress</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="schedule">
          <StaffSchedule />
        </TabsContent>

        <TabsContent value="timeclock">
          <div className="-mx-4 lg:-mx-6">
            <TimeclockPanel />
          </div>
        </TabsContent>

        <TabsContent value="foh">
          <AreaChecklists area="foh" embedded />
        </TabsContent>

        <TabsContent value="boh">
          <AreaChecklists area="boh" embedded />
        </TabsContent>

        <TabsContent value="checklists" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Service hours</CardTitle>
          <CardDescription>
            Checklists belong to one business day and clear after closing time, even if you close
            after midnight.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="openTime">Opening time</Label>
              <Input
                id="openTime"
                type="time"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="closeTime">Closing time</Label>
              <Input
                id="closeTime"
                type="time"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="timezone">Time zone</Label>
              <Input
                id="timezone"
                list="timezone-options"
                autoComplete="off"
                spellCheck={false}
                value={timezone}
                placeholder="Start typing a city, e.g. New_York"
                onChange={(e) => setTimezone(e.target.value)}
                aria-describedby="timezone-hint"
              />
              <datalist id="timezone-options">
                {TIMEZONES.map((zone) => (
                  <option key={zone} value={zone} />
                ))}
              </datalist>
              <p id="timezone-hint" className="text-xs text-muted-foreground">
                Pick from the list. Every report and checklist uses this to decide what &quot;today&quot; is.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save hours"}
            </Button>
            {data ? (
              <span className="text-sm text-muted-foreground">
                Open {formatTime(data.settings.openTime)} to {formatTime(data.settings.closeTime)}. Business day{" "}
                {data.date}.
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s checklists</CardTitle>
          <CardDescription>
            {data
              ? data.phase === "before-open"
                ? "Not open yet. The opening lists are waiting."
                : data.phase === "open"
                  ? "Service is running."
                  : "Service is closed for the day."
              : "Loading…"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {(data?.groups ?? []).map((g) => {
            const pct = g.total ? Math.round((g.completed / g.total) * 100) : 0;
            return (
              <Link
                key={`${g.area}-${g.shift}`}
                to={`/${g.area}/${g.shift}` as string}
                className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>{groupLabels[`${g.area}-${g.shift}`]}</span>
                  <span className="text-muted-foreground">
                    {g.completed}/{g.total}
                  </span>
                </div>
                <Progress value={pct} className="mt-3 h-2" />
              </Link>
            );
          })}
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
