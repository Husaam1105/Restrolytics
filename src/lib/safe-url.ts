/**
 * Guards for URLs the server will fetch (vendor portals). Only public https
 * hostnames are allowed: no IP literals, localhost or internal names, so a
 * saved vendor can't make the server call into a private network.
 * Server code fetches through publicOnlyFetch (safe-url.server.ts), which also
 * pins each connection to an address checked with isPrivateAddress.
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

function isPrivateIPv4(ip: string) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255))
    return true;
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

/** Expands an IPv6 address into 8 numeric hextets, or null if it isn't one. */
function hextets(ip: string): number[] | null {
  let text = ip;
  // Trailing embedded IPv4 (e.g. ::ffff:10.0.0.1) becomes two hextets.
  const v4 = /(\d{1,3}(?:\.\d{1,3}){3})$/.exec(text);
  if (v4) {
    const [a, b, c, d] = v4[1]!.split(".").map(Number) as [number, number, number, number];
    text =
      text.slice(0, -v4[1]!.length) +
      `${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  const all = [...head, ...Array(Math.max(0, fill)).fill("0"), ...tail];
  if (all.length !== 8 || all.some((h) => !/^[0-9a-f]{1,4}$/i.test(h))) return null;
  return all.map((h) => parseInt(h, 16));
}

/**
 * True for any address a public website should never resolve to. IPv6 is an
 * allowlist: only global unicast (2000::/3) passes, minus documentation space;
 * forms that embed IPv4 (mapped, 6to4) are checked as IPv4.
 */
export function isPrivateAddress(address: string) {
  const ip = address.toLowerCase();
  if (!ip.includes(":")) return isPrivateIPv4(ip);
  const h = hextets(ip);
  if (!h) return true;
  const embedded = (hi: number, lo: number) => `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  // ::ffff:a.b.c.d (mapped) and ::a.b.c.d (compatible)
  if (h.slice(0, 5).every((x) => x === 0) && (h[5] === 0xffff || h[5] === 0)) {
    return isPrivateIPv4(embedded(h[6]!, h[7]!));
  }
  // 2002:aabb:ccdd::/48 is 6to4 for a.b.c.d
  if (h[0] === 0x2002) return isPrivateIPv4(embedded(h[1]!, h[2]!));
  // Global unicast only (2000::/3), excluding 2001:db8::/32 documentation.
  if (h[0]! < 0x2000 || h[0]! > 0x3fff) return true;
  if (h[0] === 0x2001 && h[1] === 0x0db8) return true;
  return false;
}
