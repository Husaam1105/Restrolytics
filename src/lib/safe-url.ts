/**
 * Guards for URLs the server will fetch (vendor portals). Only public https
 * hostnames are allowed: no IP literals, localhost or internal names, so a
 * saved vendor can't make the server call into a private network.
 */
const BLOCKED_SUFFIXES = [".local", ".internal", ".localhost", ".lan", ".home", ".corp"];

export function isPublicHttpsUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  if (!host.includes(".")) return false; // single-label names resolve inside networks
  if (host === "localhost" || BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false; // IPv4 literal
  if (host.startsWith("[") || host.includes(":")) return false; // IPv6 literal
  return true;
}
