import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Mail, Plus, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  cancelInvite,
  createRestaurant,
  getTeam,
  getWorkspace,
  inviteMember,
  removeMember,
  updateMemberRole,
  type MemberRole,
} from "@/lib/tenant.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_authenticated/settings/access")({
  component: TeamPage,
  head: () => ({
    meta: [
      { title: "Team & access — Restaurant CRM" },
      {
        name: "description",
        content:
          "Invite owners, managers and staff to a restaurant and control what each person can see.",
      },
      { property: "og:title", content: "Team & access — Restaurant CRM" },
      {
        property: "og:description",
        content: "Invite your team and control access per restaurant.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const ROLE_LABEL: Record<MemberRole, string> = {
  owner: "Owner",
  manager: "Manager",
  staff: "Staff",
};

const ROLE_HELP: Record<MemberRole, string> = {
  owner: "Full access, including team and restaurant settings",
  manager: "Inventory, vendors, sales, checklists and inviting staff",
  staff: "Views the restaurant and completes checklist items",
};

function TeamPage() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const fetchTeam = useServerFn(getTeam);
  const fetchWorkspace = useServerFn(getWorkspace);
  const invite = useServerFn(inviteMember);
  const cancel = useServerFn(cancelInvite);
  const changeRole = useServerFn(updateMemberRole);
  const remove = useServerFn(removeMember);
  const addRestaurant = useServerFn(createRestaurant);

  const { data: team } = useQuery({ queryKey: ["team"], queryFn: () => fetchTeam() });
  const { data: workspace } = useQuery({ queryKey: ["workspace"], queryFn: () => fetchWorkspace() });

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("staff");
  const [newRestaurant, setNewRestaurant] = useState("");

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["team"] });
    await queryClient.invalidateQueries({ queryKey: ["workspace"] });
  };

  const inviteMutation = useMutation({
    mutationFn: () => invite({ data: { email, role } }),
    onSuccess: async (result) => {
      setEmail("");
      await refresh();
      toast.success(`${result.email} can now sign in and will land in this restaurant.`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const cancelMutation = useMutation({
    mutationFn: (inviteId: string) => cancel({ data: { inviteId } }),
    onSuccess: refresh,
    onError: (error: Error) => toast.error(error.message),
  });

  const roleMutation = useMutation({
    mutationFn: (input: { memberId: string; role: MemberRole }) => changeRole({ data: input }),
    onSuccess: async () => {
      await refresh();
      toast.success("Role updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => remove({ data: { memberId } }),
    onSuccess: async () => {
      await refresh();
      toast.success("Removed from this restaurant");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const restaurantMutation = useMutation({
    mutationFn: () => addRestaurant({ data: { name: newRestaurant } }),
    onSuccess: async () => {
      setNewRestaurant("");
      await queryClient.invalidateQueries();
      await router.invalidate();
      toast.success("Restaurant added and selected");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const isOwner = team?.role === "owner";
  const canManage = team?.role === "owner" || team?.role === "manager";
  const assignableRoles: MemberRole[] = isOwner ? ["staff", "manager", "owner"] : ["staff"];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team &amp; access</h1>
        <p className="text-sm text-muted-foreground">
          {team?.restaurantName
            ? `People with access to ${team.restaurantName}. Everyone only sees the restaurants they belong to.`
            : "People with access to this restaurant."}
        </p>
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4" /> Invite someone
            </CardTitle>
            <CardDescription>
              They sign up with this email address and are added to this restaurant automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="cook@restaurant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:w-48">
                <Label>Role</Label>
                <Select value={role} onValueChange={(value) => setRole(value as MemberRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableRoles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                disabled={!email.trim() || inviteMutation.isPending}
                onClick={() => inviteMutation.mutate()}
              >
                {inviteMutation.isPending ? "Inviting…" : "Send invite"}
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{ROLE_HELP[role]}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">People</CardTitle>
          <CardDescription>{team?.members.length ?? 0} with access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(team?.members ?? []).map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {member.email ?? "Team member"}
                  {member.userId === team?.myUserId && (
                    <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{ROLE_HELP[member.role]}</p>
              </div>
              <div className="flex items-center gap-2">
                {isOwner && member.userId !== team?.myUserId ? (
                  <Select
                    value={member.role}
                    onValueChange={(value) =>
                      roleMutation.mutate({ memberId: member.id, role: value as MemberRole })
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["staff", "manager", "owner"] as MemberRole[]).map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="rounded bg-muted px-2 py-1 text-xs">
                    {ROLE_LABEL[member.role]}
                  </span>
                )}
                {canManage && member.userId !== team?.myUserId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMutation.mutate(member.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {canManage && (team?.invites.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4" /> Waiting to join
            </CardTitle>
            <CardDescription>They join as soon as they sign in with that email.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(team?.invites ?? []).map((pending) => (
              <div
                key={pending.id}
                className="flex items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{pending.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Invited as {ROLE_LABEL[pending.role]}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => cancelMutation.mutate(pending.id)}
                >
                  Cancel
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" /> Add another restaurant
          </CardTitle>
          <CardDescription>
            You currently have access to {workspace?.restaurants.length ?? 0}. Each one keeps its own
            inventory, vendors, sales and checklists.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="new-restaurant">Restaurant name</Label>
            <Input
              id="new-restaurant"
              placeholder="Second Avenue Grill"
              value={newRestaurant}
              onChange={(e) => setNewRestaurant(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            disabled={!newRestaurant.trim() || restaurantMutation.isPending}
            onClick={() => restaurantMutation.mutate()}
          >
            {restaurantMutation.isPending ? "Adding…" : "Add restaurant"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
