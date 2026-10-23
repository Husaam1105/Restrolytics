import { createFileRoute } from "@tanstack/react-router";

/** The public pages search engines should index. */
const PAGES = [
  { path: "/", priority: "1.0" },
  { path: "/pricing", priority: "0.8" },
  { path: "/contact", priority: "0.6" },
  { path: "/privacy", priority: "0.3" },
  { path: "/terms", priority: "0.3" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { siteUrl } = await import("@/lib/site-url.server");
        const base = siteUrl();
        const urls = PAGES.map(
          (p) => `  <url><loc>${base}${p.path}</loc><changefreq>monthly</changefreq><priority>${p.priority}</priority></url>`,
        ).join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
        return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});
