import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("クラス名を結合できる", () => {
    expect(cn("text-sm", "font-medium")).toBe("text-sm font-medium");
  });
});
