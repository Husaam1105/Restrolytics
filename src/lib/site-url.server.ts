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
