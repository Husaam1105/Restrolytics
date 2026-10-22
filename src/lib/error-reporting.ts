/**
 * Single place to report client-side errors. Logs to the console today;
 * wire an error tracker (e.g. Sentry) in here when one is chosen.
 */
export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  const route = typeof window === "undefined" ? undefined : window.location.pathname;
  console.error("[error]", { route, ...context }, error);
}
