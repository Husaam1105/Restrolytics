import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { createRestaurant } from "@/lib/tenant.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Shown when a signed-in user has no restaurant yet. */
export function RestaurantOnboarding({
  email,
  canCreate,
  onSignOut,
}: {
  email?: string | null;
  canCreate: boolean;
  onSignOut: () => void;
}) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const queryClient = useQueryClient();
  const router = useRouter();
  const create = useServerFn(createRestaurant);

  const mutation = useMutation({
    mutationFn: () => create({ data: { name, location } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      await router.invalidate();
      toast.success("Restaurant created");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!canCreate) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>You're signed in, but not on a team yet</CardTitle>
            <CardDescription>
              {email ? `Signed in as ${email}. ` : ""}
              Restrolytics is invite-only. Ask your manager to invite this exact email address, then
              refresh this page. New restaurant? Our team sets up your account with you.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <a href="mailto:hello@restrolytics.com?subject=Restrolytics%20access">
                Contact Restrolytics
              </a>
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh
            </Button>
            <Button variant="ghost" onClick={onSignOut}>
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set up your first restaurant</CardTitle>
          <CardDescription>
            {email ? `Signed in as ${email}. ` : ""}
            Create a restaurant to start tracking inventory, sales and checklists. You can add more
            later and invite your team to each one.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="restaurant-name">Restaurant name</Label>
            <Input
              id="restaurant-name"
              placeholder="Main Street Kitchen"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="restaurant-location">Location (optional)</Label>
            <Input
              id="restaurant-location"
              placeholder="Brooklyn, NY"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            disabled={!name.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Creating…" : "Create restaurant"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Were you invited by someone? Ask them to invite this exact email address and it will
            appear here automatically.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
