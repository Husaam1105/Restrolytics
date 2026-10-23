import { describe, expect, it } from "vitest";
import { itemNameKey } from "./item-match";

describe("itemNameKey", () => {
  it("lowercases and trims, leaving wildcard characters as plain text", () => {
    expect(itemNameKey("  Roma Tomatoes ")).toBe("roma tomatoes");
    expect(itemNameKey("100% Juice *Case*")).toBe("100% juice *case*");
  });
});
