import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { themeBootScript } from "@/lib/theme";
import { ConfirmProvider } from "@/components/confirm-dialog";
import { absoluteUrl } from "@/lib/seo";
import { BrandGlyph } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";

import appCss from "../styles.css?url";
import { reportError } from "@/lib/error-reporting";

function NotFoundComponent() {
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <BrandGlyph className="mx-auto size-12" />
        <p className="text-figure mt-6 text-6xl text-link">404</p>
        <h1 className="text-title mt-3">This page isn&apos;t on the menu</h1>
        <p className="mt-2 text-muted-foreground">The link may be old, or the page has moved.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link to="/dashboard">Go to your dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/">Restrolytics home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  useEffect(() => {
    reportError(error, { boundary: "root" });
  }, [error]);

  return (
    <main id="main" className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <BrandGlyph className="mx-auto size-12" />
        <h1 className="text-title mt-6">This page didn&apos;t load</h1>
        <p className="mt-2 text-muted-foreground">
          Something failed on our side. Try again, and if it keeps happening, email
          hello@restrolytics.com.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Button
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Try again
          </Button>
          <Button variant="outline" asChild>
            <a href="/">Restrolytics home</a>
          </Button>
        </div>
      </div>
    </main>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Restrolytics" },
      {
        name: "description",
        content:
          "Sales, stock, shifts and payroll for restaurants, with a copilot that knows your numbers.",
      },
      { name: "theme-color", content: "#fdfafb" },
      { property: "og:site_name", content: "Restrolytics" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: absoluteUrl("/og.png") },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: absoluteUrl("/og.png") },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Sets light/dark before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  // Loaded after hydration so the Supabase SDK stays out of the public pages' first paint.
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    void import("@/integrations/supabase/client").then(({ supabase }) => {
      if (cancelled) return;
      const { data } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
          router.invalidate();
          if (event !== "SIGNED_OUT") {
            queryClient.invalidateQueries();
          }
        }
      });
      unsubscribe = () => data.subscription.unsubscribe();
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [queryClient, router]);

  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </ConfirmProvider>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
