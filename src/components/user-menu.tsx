import { Check, LogOut, Monitor, Moon, Sun, UserRound } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useTheme, type ThemePreference } from "@/lib/theme";

const THEMES: { id: ThemePreference; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "Match device", icon: Monitor },
];

function initials(name: string) {
  const parts = name.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}

/** Account menu in the app header: who's signed in, theme, sign out. */
export function UserMenu({
  email,
  name,
  role,
  onSignOut,
}: {
  email: string | null;
  name?: string | null;
  role?: string | null;
  onSignOut: () => void;
}) {
  const { preference, setPreference } = useTheme();
  const display = name || email || "Account";
  // Staff sign in with a username; don't show the internal email domain.
  const shownEmail = email?.endsWith("@kaizr.staff") ? email.replace("@kaizr.staff", "") : email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 px-1.5 sm:px-2" aria-label="Account menu">
          <span className="grid size-8 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {initials(display)}
          </span>
          <span className="hidden max-w-[10rem] truncate text-sm font-medium md:inline">{display}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="space-y-0.5 font-normal">
          <p className="truncate text-sm font-semibold">{display}</p>
          {shownEmail && shownEmail !== display ? (
            <p className="truncate text-xs text-muted-foreground">{shownEmail}</p>
          ) : null}
          {role ? <p className="text-xs capitalize text-muted-foreground">{role}</p> : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Appearance</DropdownMenuLabel>
        {THEMES.map(({ id, label, icon: Icon }) => (
          <DropdownMenuItem key={id} onSelect={() => setPreference(id)} className="gap-2">
            <Icon className="size-4" aria-hidden="true" />
            <span className="flex-1">{label}</span>
            {preference === id ? <Check className="size-4" aria-label="Selected" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="gap-2">
          <a href="/timeclock">
            <UserRound className="size-4" aria-hidden="true" />
            My hours and details
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onSignOut} className="gap-2">
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
