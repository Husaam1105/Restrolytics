import { describe, expect, it } from "vitest";
import { isPublicHttpsUrl } from "./safe-url";

describe("isPublicHttpsUrl", () => {
  it("accepts public https sites", () => {
    expect(isPublicHttpsUrl("https://www.depotdeliveries.com/my-account/")).toBe(true);
  });

  it("rejects anything the server shouldn't call", () => {
    for (const url of [
      "http://www.vendor.com",
      "https://localhost:3000",
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
