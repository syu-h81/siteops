import { z } from "zod";

const legalVersionSchema = z.string().trim().min(1).max(50);

export const legalConsentSchema = z
  .object({
    acceptPrivacy: z.boolean().refine((value) => value),
    acceptTerms: z.boolean().refine((value) => value),
    privacyVersion: legalVersionSchema,
    termsVersion: legalVersionSchema,
  })
  .strict();

export const organizationSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "組織名を入力してください。")
      .max(200, "組織名は200文字以内で入力してください。"),
  })
  .strict();

export type LegalConsentValues = z.infer<typeof legalConsentSchema>;
export type OrganizationValues = z.infer<typeof organizationSchema>;
