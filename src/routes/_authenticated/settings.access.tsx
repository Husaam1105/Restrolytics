import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Mail, Plus, UserMinus, UserPlus, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { useConfirm } from "@/components/confirm-dialog";
import { PageContainer, PageHeader, SectionHeader } from "@/components/page";
import { QueryBoundary } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  cancelInvite,
  createRestaurant,
  getTeam,
  inviteMember,
  removeMember,
  updateMemberRole,
  type MemberRole,
} from "@/lib/tenant.functions";
import { requireManagerRoute, workspaceQuery } from "@/lib/workspace";

export const Route = createFileRoute("/_authenticated/settings/access")({
  beforeLoad: requireManagerRoute,
  component: TeamPage,
  head: () => ({ meta: [{ title: "Team access · Restrolytics" }] }),
});

const ROLE_LABEL: Record<MemberRole, string> = {
  owner: "Owner",
  manager: "Manager",
  staff: "Staff",
};

const ROLE_HELP: Record<MemberRole, string> = {
  owner: "Everything, including team access and restaurant settings.",
  manager: "Sales, inventory, payroll and checklists. Can invite staff.",
  staff: "Their own hours, pay, schedule and checklists. No sales or other people's pay.",
};

/** Staff username logins are stored as <username>@kaizr.staff; show the username. */
function displayLogin(email: string | null) {
  if (!email) return "Team member";
  return email.endsWith("@kaizr.staff") ? email.replace("@kaizr.staff", "") : email;
}

function TeamPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const confirm = useConfirm();

  const fetchTeam = useServerFn(getTeam);
  const invite = useServerFn(inviteMember);
  const cancel = useServerFn(cancelInvite);
  const changeRole = useServerFn(updateMemberRole);
  const remove = useServerFn(removeMember);
  const addRestaurant = useServerFn(createRestaurant);

  const teamQuery = useQuery({ queryKey: ["team"], queryFn: () => fetchTeam() });
  const { data: workspace } = useQuery(workspaceQuery);

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
      toast.success(
        `${result.email} is invited. New people get an email to set a password; anyone with an account sees this restaurant next time they sign in.`,
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const cancelMutation = useMutation({
    mutationFn: (inviteId: string) => cancel({ data: { inviteId } }),
    onSuccess: async () => {
      await refresh();
      toast.success("Invite cancelled");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const roleMutation = useMutation({
    mutationFn: (input: { memberId: string; role: MemberRole }) => changeRole({ data: input }),
    onSuccess: async () => {
      await refresh();
      toast.success("Role changed");
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

  const submitInvite = (e: FormEvent) => {
    e.preventDefault();
    inviteMutation.mutate();
  };

  return (
    <PageContainer size="narrow">
      <PageHeader
        context="Settings"
        title="Team access"
        description="Everyone only sees the restaurants they belong to. Staff without email get a username login from the Employees page."
      />

      <QueryBoundary query={teamQuery} errorTitle="The team didn't load">
        {(team) => {
          const isOwner = team.role === "owner";
          const assignable: MemberRole[] = isOwner ? ["staff", "manager", "owner"] : ["staff"];

          const changeMemberRole = async (memberId: string, who: string, next: MemberRole) => {
            if (
              next === "owner" &&
              !(await confirm({
                title: `Make ${who} an owner?`,
                description:
                  "Owners can change everyone's access, including yours, and delete the restaurant.",
                confirmLabel: "Make owner",
              }))
            ) {
              return;
            }
            roleMutation.mutate({ memberId, role: next });
          };

          const removePerson = async (memberId: string, who: string) => {
            if (
              await confirm({
                title: `Remove ${who} from ${team.restaurantName}?`,
                description:
                  "They lose access straight away. Their hours and pay history stay on file.",
                confirmLabel: "Remove access",
                destructive: true,
              })
            ) {
              removeMutation.mutate(memberId);
            }
          };

          return (
            <>
              <section className="surface space-y-4 p-5 sm:p-6" aria-labelledby="invite-heading">
                <SectionHeader title={<span id="invite-heading">Invite someone by email</span>} />
                <form
                  onSubmit={submitInvite}
                  className="flex flex-col gap-3 sm:flex-row sm:items-end"
                >
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="invite-email">Email</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      autoComplete="off"
                      placeholder="name@restaurant.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5 sm:w-44">
                    <Label htmlFor="invite-role">Role</Label>
                    <Select value={role} onValueChange={(v) => setRole(v as MemberRole)}>
                      <SelectTrigger id="invite-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {assignable.map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" disabled={!email.includes("@") || inviteMutation.isPending}>
                    <UserPlus />
                    {inviteMutation.isPending ? "Sending…" : "Send invite"}
                  </Button>
                </form>
                <p className="text-sm text-muted-foreground">{ROLE_HELP[role]}</p>
              </section>

              <section className="surface overflow-hidden" aria-labelledby="people-heading">
                <div className="p-5 pb-2 sm:p-6 sm:pb-2">
                  <SectionHeader
                    title={<span id="people-heading">People with access</span>}
                    description={`${team.members.length} ${team.members.length === 1 ? "person" : "people"}`}
                    actions={
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/employees">Employees and username logins</Link>
                      </Button>
                    }
                  />
                </div>
                <ul className="divide-y">
                  {team.members.map((member) => {
                    const who = displayLogin(member.email);
                    const isMe = member.userId === team.myUserId;
                    return (
                      <li
                        key={member.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-6"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {who}
                            {isMe ? (
                              <span className="ml-2 text-xs font-normal text-muted-foreground">
                                You
                              </span>
                            ) : null}
                            {member.email?.endsWith("@kaizr.staff") ? (
                              <Badge variant="secondary" className="ml-2 align-middle">
                                Username login
                              </Badge>
                            ) : null}
                          </p>
                          <p className="text-sm text-muted-foreground">{ROLE_HELP[member.role]}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isOwner && !isMe ? (
                            <Select
                              value={member.role}
                              onValueChange={(v) =>
                                void changeMemberRole(member.id, who, v as MemberRole)
                              }
                            >
                              <SelectTrigger className="w-32" aria-label={`Role for ${who}`}>
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
                            <Badge variant="outline">{ROLE_LABEL[member.role]}</Badge>
                          )}
                          {!isMe && (isOwner || member.role === "staff") ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Remove ${who}`}
                              onClick={() => void removePerson(member.id, who)}
                            >
                              <UserMinus className="text-destructive" />
                            </Button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>

              {team.invites.length > 0 ? (
                <section className="surface overflow-hidden" aria-labelledby="pending-heading">
                  <div className="p-5 pb-2 sm:p-6 sm:pb-2">
                    <SectionHeader
                      title={
                        <span id="pending-heading" className="inline-flex items-center gap-2">
                          <Mail className="size-4" aria-hidden="true" />
                          Waiting to join
                        </span>
                      }
                      description="They join as soon as they set a password or sign in with that email."
                    />
                  </div>
                  <ul className="divide-y">
                    {team.invites.map((pending) => (
                      <li
                        key={pending.id}
                        className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{pending.email}</p>
                          <p className="text-sm text-muted-foreground">
                            Invited as {ROLE_LABEL[pending.role].toLowerCase()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (
                              await confirm({
                                title: `Cancel the invite for ${pending.email}?`,
                                description:
                                  "Their invite link stops working. You can invite them again later.",
                                confirmLabel: "Cancel invite",
                                cancelLabel: "Keep invite",
                                destructive: true,
                              })
                            ) {
                              cancelMutation.mutate(pending.id);
                            }
                          }}
                        >
                          <X />
                          Cancel invite
                        </Button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {workspace?.canCreateRestaurant ? (
                <section
                  className="surface space-y-4 p-5 sm:p-6"
                  aria-labelledby="add-restaurant-heading"
                >
                  <SectionHeader
                    title={<span id="add-restaurant-heading">Add another restaurant</span>}
                    description={`You have ${workspace.restaurants.length}. Each keeps its own sales, stock, team and checklists.`}
                  />
                  <form
                    className="flex flex-col gap-3 sm:flex-row sm:items-end"
                    onSubmit={(e) => {
                      e.preventDefault();
                      restaurantMutation.mutate();
                    }}
                  >
                    <div className="flex-1 space-y-1.5">
                      <Label htmlFor="new-restaurant">Restaurant name</Label>
                      <Input
                        id="new-restaurant"
                        placeholder="Second Avenue Grill"
                        value={newRestaurant}
                        onChange={(e) => setNewRestaurant(e.target.value)}
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="outline"
                      disabled={!newRestaurant.trim() || restaurantMutation.isPending}
                    >
                      <Plus />
                      {restaurantMutation.isPending ? "Adding…" : "Add restaurant"}
                    </Button>
                  </form>
                </section>
              ) : null}
            </>
          );
        }}
      </QueryBoundary>
    </PageContainer>
  );
}
