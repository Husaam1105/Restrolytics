import { lookup } from "node:dns/promises";

import { isPrivateAddress, isPublicHttpsUrl } from "./safe-url";

/**
 * Resolves the URL's hostname and refuses it if any address is private,
 * loopback, link-local or otherwise internal. Call right before fetching,
 * and again for every redirect hop.
 */
export async function assertPublicDns(value: string) {
  if (!isPublicHttpsUrl(value)) throw new Error("The vendor portal address must be a public https:// website.");
  const host = new URL(value).hostname.replace(/\.+$/, "");
  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new Error(`Couldn't find ${host}. Check the vendor's web address.`);
  }
  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new Error("The vendor portal address points to a private network and can't be used.");
  }
}
