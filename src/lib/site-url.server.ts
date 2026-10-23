/**
 * The public base URL used in links we email (invites, resets). Always taken
 * from configuration in production, never from the request's Host header.
 */
export function siteUrl() {
  const configured = process.env["SITE_URL"]?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  if (process.env["NODE_ENV"] !== "production") return "http://localhost:8080";
  throw new Error("SITE_URL is not set. Add it to the server environment.");
}

/**
 * Base URL for crawler files (robots.txt, sitemap.xml). Falls back to the
 * request's origin when SITE_URL is missing, since these links are never
 * emailed and a 500 would hide the whole site from search engines.
 */
export function crawlerBaseUrl(request: Request) {
  try {
    return siteUrl();
  } catch {
    console.warn("[site-url] SITE_URL is not set; using the request origin for crawler files.");
    return new URL(request.url).origin;
  }
}
