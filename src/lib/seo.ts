/** Public site origin for canonical/OG URLs, from VITE_SITE_URL when set. */
const SITE = (import.meta.env["VITE_SITE_URL"] as string | undefined)?.replace(/\/+$/, "") ?? "";

export function absoluteUrl(path: string) {
  return `${SITE}${path}`;
}

/** Canonical link for a public page (omitted when no site URL is configured). */
export function canonical(path: string) {
  return SITE ? [{ rel: "canonical", href: absoluteUrl(path) }] : [];
}
