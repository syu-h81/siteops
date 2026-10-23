import { z } from "zod";

const legalDocumentIdSchema = z.string().uuid();
const legalContentHashSchema = z.string().regex(/^[0-9a-f]{64}$/);

export const legalConsentSchema = z
  .object({
    privacyAccepted: z.boolean().refine((value) => value),
    privacyContentHash: legalContentHashSchema,
    privacyDocumentId: legalDocumentIdSchema,
    termsAccepted: z.boolean().refine((value) => value),
    termsContentHash: legalContentHashSchema,
    termsDocumentId: legalDocumentIdSchema,
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
