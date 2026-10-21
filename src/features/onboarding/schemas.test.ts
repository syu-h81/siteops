import { describe, expect, it } from "vitest";

import {
  legalConsentSchema,
  organizationSchema,
} from "@/features/onboarding/schemas";

describe("オンボーディング入力", () => {
  it("両方に同意した入力だけを許可する", () => {
    const validInput = {
      acceptPrivacy: true,
      acceptTerms: true,
      privacyVersion: "1.0",
      termsVersion: "1.0",
    };

    expect(legalConsentSchema.safeParse(validInput).success).toBe(true);
    expect(
      legalConsentSchema.safeParse({ ...validInput, acceptTerms: false })
        .success,
    ).toBe(false);
  });

  it.each(["", "   ", "a".repeat(201)])("不正な組織名を拒否する", (name) => {
    expect(organizationSchema.safeParse({ name }).success).toBe(false);
  });

  it("組織名をtrimし、未知の項目を拒否する", () => {
    expect(organizationSchema.parse({ name: "  BuildLab  " }).name).toBe(
      "BuildLab",
    );
    expect(
      organizationSchema.safeParse({ name: "BuildLab", owner_user_id: "x" })
        .success,
    ).toBe(false);
  });
});
