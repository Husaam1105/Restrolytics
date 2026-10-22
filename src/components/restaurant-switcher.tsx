import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronsUpDown, MapPin, Plus, Store } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { createRestaurant, switchRestaurant } from "@/lib/tenant.functions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  staff: "Staff",
};

type RestaurantOption = {
  id: string;
  name: string;
  location?: string | null;
  role: string;
};

export function RestaurantSwitcher({
  restaurants,
  activeId,
}: {
  restaurants: RestaurantOption[];
  activeId: string | null;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const switchFn = useServerFn(switchRestaurant);
  const createFn = useServerFn(createRestaurant);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  const mutation = useMutation({
    mutationFn: (restaurantId: string) => switchFn({ data: { restaurantId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      await router.invalidate();
      toast.success("Switched restaurant");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const createMutation = useMutation({
    mutationFn: () => createFn({ data: { name, location } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      await router.invalidate();
      setAddOpen(false);
      setName("");
      setLocation("");
      toast.success("Restaurant added");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activeRestaurant = restaurants.find((r) => r.id === activeId) ?? restaurants[0];
  if (!activeRestaurant) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="min-w-0 max-w-full gap-2"
            disabled={mutation.isPending}
          >
            <Store className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">{activeRestaurant.name}</span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Your restaurants</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {restaurants.map((restaurant) => (
            <DropdownMenuItem
              key={restaurant.id}
              onSelect={() => {
                if (restaurant.id !== activeRestaurant.id) mutation.mutate(restaurant.id);
              }}
              className="flex items-center justify-between gap-2"
            >
              <span className="min-w-0">
                <span className="block truncate">{restaurant.name}</span>
                {restaurant.location && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{restaurant.location}</span>
                  </span>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                {ROLE_LABEL[restaurant.role] ?? restaurant.role}
                {restaurant.id === activeRestaurant.id && <Check className="h-3.5 w-3.5" />}
              </span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add another restaurant
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add a restaurant</DialogTitle>
            <DialogDescription>
              Add another restaurant or location to your account. Each one keeps its own sales,
              inventory, staff and reports, and you can switch between them here.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-restaurant-name">Restaurant name</Label>
              <Input
                id="add-restaurant-name"
                placeholder="Main Street Kitchen"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-restaurant-location">Location (optional)</Label>
              <Input
                id="add-restaurant-location"
                placeholder="Brooklyn, NY"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              disabled={!name.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Adding…" : "Add restaurant"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
