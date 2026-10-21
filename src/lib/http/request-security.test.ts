import { describe, expect, it } from "vitest";

import { hasJsonContentType, hasSameOrigin } from "@/lib/http/request-security";

function request(headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/v1/onboarding", { headers });
}

describe("APIリクエスト保護", () => {
  it("JSONのContent-Typeをcharset付きでも許可する", () => {
    expect(
      hasJsonContentType(
        request({ "content-type": "application/json; charset=utf-8" }),
      ),
    ).toBe(true);
    expect(hasJsonContentType(request({ "content-type": "text/plain" }))).toBe(
      false,
    );
  });

  it("同一Originだけを許可する", () => {
    expect(hasSameOrigin(request({ origin: "http://localhost:3000" }))).toBe(
      true,
    );
    expect(hasSameOrigin(request({ origin: "https://attacker.example" }))).toBe(
      false,
    );
    expect(hasSameOrigin(request())).toBe(false);
  });
});
