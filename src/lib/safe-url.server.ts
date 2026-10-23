import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { Agent, fetch as undiciFetch } from "undici";

import { isPrivateAddress, isPublicHttpsUrl } from "./safe-url";

class PrivateAddressError extends Error {
  constructor() {
    super("The vendor portal address points to a private network and can't be used.");
    this.name = "PrivateAddressError";
  }
}

/**
 * Resolves the name and hands the socket only vetted public addresses, so the
 * address that was checked is the one that gets connected to (no DNS
 * rebinding between check and connect).
 */
function vettedLookup(
  hostname: string,
  options: { all?: boolean } & Record<string, unknown>,
  callback: (
    err: NodeJS.ErrnoException | null,
    address: string | LookupAddress[],
    family?: number,
  ) => void,
) {
  dnsLookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
    if (err) return callback(err, "");
    if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
      return callback(new PrivateAddressError() as NodeJS.ErrnoException, "");
    }
    if (options.all) return callback(null, addresses);
    const first = addresses[0]!;
    return callback(null, first.address, first.family);
  });
}

const publicOnlyAgent = new Agent({
  connect: { lookup: vettedLookup as never, timeout: 15_000 },
  headersTimeout: 20_000,
  bodyTimeout: 30_000,
});

/**
 * fetch() for server-side requests to user-supplied URLs (vendor portals).
 * Requires a public https hostname and pins the connection to an address
 * verified as public. Never follows redirects itself.
 */
export async function publicOnlyFetch(url: string, init: RequestInit & { redirect: "manual" }) {
  if (!isPublicHttpsUrl(url))
    throw new Error("The vendor portal address must be a public https:// website.");
  try {
    return (await undiciFetch(url, {
      ...(init as object),
      dispatcher: publicOnlyAgent,
    } as never)) as unknown as Response;
  } catch (error) {
    const cause = (error as { cause?: unknown }).cause;
    if (cause instanceof PrivateAddressError) throw cause;
    if ((cause as { code?: string } | undefined)?.code === "ENOTFOUND") {
      throw new Error(`Couldn't find ${new URL(url).hostname}. Check the vendor's web address.`);
    }
    throw error;
  }
}
