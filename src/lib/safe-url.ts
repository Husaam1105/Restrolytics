/**
 * Guards for URLs the server will fetch (vendor portals). Only public https
 * hostnames are allowed: no IP literals, localhost or internal names, so a
 * saved vendor can't make the server call into a private network.
 * Server code should also call assertPublicDns (safe-url.server.ts) right
 * before each request, which checks what the name resolves to.
 */
const BLOCKED_SUFFIXES = [".local", ".internal", ".localhost", ".lan", ".home", ".corp", ".arpa"];

export function isPublicHttpsUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) return false;
  // "localhost." and "printer.local." are the same hosts as without the dot.
  const host = url.hostname.toLowerCase().replace(/\.+$/, "");
  if (!host.includes(".")) return false; // single-label names resolve inside networks
  if (host === "localhost" || BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false; // IPv4 literal (URL normalises decimal/hex forms to this)
  if (host.startsWith("[") || host.includes(":")) return false; // IPv6 literal
  return true;
}

/** True for addresses a public website should never resolve to. */
export function isPrivateAddress(address: string) {
  const ip = address.toLowerCase();
  if (ip.includes(":")) {
    if (ip === "::" || ip === "::1") return true;
    if (ip.startsWith("::ffff:")) return isPrivateAddress(ip.slice(7)); // IPv4-mapped
    if (/^f[cd]/.test(ip)) return true; // fc00::/7 unique local
    if (/^fe[89ab]/.test(ip)) return true; // fe80::/10 link local
    return false;
  }
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts as [number, number, number, number];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}
