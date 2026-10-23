import { describe, expect, it } from "vitest";
import { isPrivateAddress, isPublicHttpsUrl } from "./safe-url";

describe("isPublicHttpsUrl", () => {
  it("accepts public https sites", () => {
    expect(isPublicHttpsUrl("https://www.depotdeliveries.com/my-account/")).toBe(true);
  });

  it("rejects anything the server shouldn't call", () => {
    for (const url of [
      "http://www.vendor.com",
      "https://localhost:3000",
      "https://localhost./",
      "https://printer.local./",
      "https://2130706433/",
      "https://0x7f.0.0.1/",
      "https://169.254.169.254/latest/meta-data",
      "https://10.0.0.5/",
      "https://[::1]/",
      "https://intranet/",
      "https://printer.local/",
      "https://user:pass@vendor.com/",
      "file:///etc/passwd",
      "not a url",
    ]) {
      expect(isPublicHttpsUrl(url), url).toBe(false);
    }
  });
});

describe("isPrivateAddress", () => {
  it("flags internal ranges and allows public ones", () => {
    for (const ip of ["10.1.2.3", "127.0.0.1", "169.254.169.254", "172.20.0.1", "192.168.1.1", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1"]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
    for (const ip of ["8.8.8.8", "104.18.2.3", "2606:4700::1111"]) {
      expect(isPrivateAddress(ip), ip).toBe(false);
    }
  });
});
