import { describe, expect, it } from "vitest";
import { likeExact } from "./item-match";

describe("likeExact", () => {
  it("escapes LIKE wildcards and backslashes", () => {
    expect(likeExact("100% Juice")).toBe("100\\% Juice");
    expect(likeExact("Item_A")).toBe("Item\\_A");
    expect(likeExact("C:\\path")).toBe("C:\\\\path");
  });

  it("trims surrounding whitespace", () => {
    expect(likeExact("  Roma Tomatoes ")).toBe("Roma Tomatoes");
  });
});
