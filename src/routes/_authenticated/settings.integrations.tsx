import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plug, RefreshCw, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PLATFORMS, type PlatformMeta } from "@/lib/platforms";
import {
  connectPlatform,
  disconnectPlatform,
  listPlatformConnections,
  syncPlatform,
} from "@/lib/integrations.functions";
import { requireManagerRoute } from "@/lib/workspace";

export const Route = createFileRoute("/_authenticated/settings/integrations")({
  beforeLoad: requireManagerRoute,
  component: IntegrationsPage,
  head: () => ({
    meta: [
      { title: "Integrations — Restaurant CRM" },
      {
        name: "description",
        content: "Connect Toast POS, Uber Eats, DoorDash and Grubhub so orders land in one place.",
      },
      { property: "og:title", content: "Integrations — Restaurant CRM" },
      {
        property: "og:description",
        content: "Connect your POS and delivery accounts to sync orders automatically.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Connection = {
  id: string;
  platform: string;
  status: string;
  account_label: string | null;
  last_synced_at: string | null;
  last_error: string | null;
};

function IntegrationsPage() {
  const queryClient = useQueryClient();
  const fetchConnections = useServerFn(listPlatformConnections);
  const connect = useServerFn(connectPlatform);
  const disconnect = useServerFn(disconnectPlatform);
  const sync = useServerFn(syncPlatform);

  const [activePlatform, setActivePlatform] = useState<PlatformMeta | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const { data } = useQuery({
    queryKey: ["platform-connections"],
    queryFn: () => fetchConnections(),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["platform-connections"] });
    queryClient.invalidateQueries({ queryKey: ["sales-overview"] });
  };

  const connectMutation = useMutation({
    mutationFn: (input: { platform: string; credentials: Record<string, string> }) =>
      connect({ data: input }),
    onSuccess: () => {
      toast.success("Account connected");
      setActivePlatform(null);
      setFields({});
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: (connectionId: string) => disconnect({ data: { connectionId } }),
    onSuccess: () => {
      toast.success("Account disconnected");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const syncMutation = useMutation({
    mutationFn: (connectionId: string) => sync({ data: { connectionId } }),
    onSuccess: (result) => {
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const connections: Connection[] = data?.connections ?? [];
  const byPlatform = new Map(connections.map((c) => [c.platform, c]));

  const openDialog = (platform: PlatformMeta) => {
    setActivePlatform(platform);
    setFields(Object.fromEntries(platform.fields.map((f) => [f.key, ""])));
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Connect your POS and delivery accounts so every order lands in Sales automatically.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {PLATFORMS.map((platform) => {
          const connection = byPlatform.get(platform.id);
          const isConnected = connection?.status === "connected";
          const hasError = connection?.status === "error";
          return (
            <Card key={platform.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      {platform.name}
                      <Badge variant="outline">{platform.kind}</Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">{platform.description}</CardDescription>
                  </div>
                  <Badge variant={isConnected ? "default" : hasError ? "destructive" : "secondary"}>
                    {isConnected ? "Connected" : hasError ? "Error" : "Not connected"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {connection ? (
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {connection.account_label ? <p>Account: {connection.account_label}</p> : null}
                    <p>
                      Last sync:{" "}
                      {connection.last_synced_at
                        ? new Date(connection.last_synced_at).toLocaleString("en-US")
                        : "never"}
                    </p>
                    {connection.last_error ? (
                      <p className="text-destructive">{connection.last_error}</p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Add your {platform.name} credentials to start syncing orders.
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={connection ? "outline" : "default"}
                    onClick={() => openDialog(platform)}
                  >
                    <Plug className="mr-1.5 h-4 w-4" />
                    {connection ? "Update credentials" : "Connect"}
                  </Button>
                  {connection ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={syncMutation.isPending}
                        onClick={() => syncMutation.mutate(connection.id)}
                      >
                        {syncMutation.isPending && syncMutation.variables === connection.id ? (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-1.5 h-4 w-4" />
                        )}
                        Sync now
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={disconnectMutation.isPending}
                        onClick={() => disconnectMutation.mutate(connection.id)}
                      >
                        <Trash2 className="mr-1.5 h-4 w-4" />
                        Disconnect
                      </Button>
                    </>
                  ) : null}
                  <Button size="sm" variant="link" asChild>
                    <a href={platform.docsUrl} target="_blank" rel="noreferrer">
                      Where to find these
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={activePlatform !== null}
        onOpenChange={(open) => !open && setActivePlatform(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {activePlatform?.name}</DialogTitle>
            <DialogDescription>
              Credentials are stored securely on the server and never shown in the browser.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {activePlatform?.fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type={field.secret ? "password" : "text"}
                  placeholder={field.placeholder}
                  value={fields[field.key] ?? ""}
                  onChange={(e) => setFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setActivePlatform(null)}>
              Cancel
            </Button>
            <Button
              disabled={connectMutation.isPending}
              onClick={() =>
                activePlatform &&
                connectMutation.mutate({ platform: activePlatform.id, credentials: fields })
              }
            >
              {connectMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Save &amp; connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
