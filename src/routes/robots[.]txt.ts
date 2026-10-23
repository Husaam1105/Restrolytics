import { createFileRoute } from "@tanstack/react-router";

/** robots.txt: public pages are crawlable; the signed-in app and APIs are not. */
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { crawlerBaseUrl } = await import("@/lib/site-url.server");
        const body = [
          "User-agent: *",
          "Allow: /",
          "Disallow: /api/",
          "Disallow: /dashboard",
          "Disallow: /auth",
          "",
          `Sitemap: ${crawlerBaseUrl(request)}/sitemap.xml`,
          "",
        ].join("\n");
        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
