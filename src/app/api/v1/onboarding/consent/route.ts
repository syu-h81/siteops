import { NextResponse, type NextRequest } from "next/server";

import { legalConsentSchema } from "@/features/onboarding/schemas";
import {
  findLegalDocument,
  getUsableCurrentLegalDocuments,
} from "@/lib/legal/documents";
import { hasJsonContentType, hasSameOrigin } from "@/lib/http/request-security";
import { getOnboardingStatus } from "@/lib/onboarding/get-onboarding-status";
import { createClient } from "@/lib/supabase/server";

const responseHeaders = { "Cache-Control": "private, no-store" };

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { headers: responseHeaders, status },
  );
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return errorResponse(401, "unauthorized", "ログインが必要です。");
  }

  if (!hasJsonContentType(request)) {
    return errorResponse(
      400,
      "validation_error",
      "リクエスト形式が正しくありません。",
    );
  }

  if (!hasSameOrigin(request)) {
    return errorResponse(
      403,
      "forbidden",
      "リクエストを確認できませんでした。",
    );
  }

  let input: unknown;

  try {
    input = await request.json();
  } catch {
    return errorResponse(
      400,
      "validation_error",
      "入力内容を確認してください。",
    );
  }

  const parsedInput = legalConsentSchema.safeParse(input);

  if (!parsedInput.success) {
    return errorResponse(
      400,
      "validation_error",
      "利用規約とプライバシーポリシーの両方を確認してください。",
    );
  }

  try {
    const documents = await getUsableCurrentLegalDocuments(supabase);
    const terms = findLegalDocument(documents, "terms");
    const privacy = findLegalDocument(documents, "privacy");

    if (!terms || !privacy) {
      return errorResponse(
        409,
        "legal_unavailable",
        "正式文書を準備中のため、現在は同意できません。",
      );
    }

    if (
      terms.id !== parsedInput.data.termsDocumentId ||
      terms.content_hash !== parsedInput.data.termsContentHash ||
      privacy.id !== parsedInput.data.privacyDocumentId ||
      privacy.content_hash !== parsedInput.data.privacyContentHash
    ) {
      return errorResponse(
        409,
        "legal_documents_changed",
        "法務文書が更新されました。内容を再確認してください。",
      );
    }

    const currentStatus = await getOnboardingStatus();

    if (
      currentStatus === "organization_required" ||
      currentStatus === "completed"
    ) {
      return NextResponse.json(
        { data: { status: currentStatus } },
        { headers: responseHeaders },
      );
    }

    if (currentStatus !== "consent_required") {
      return errorResponse(
        currentStatus === "unauthenticated" ? 401 : 409,
        currentStatus === "unauthenticated"
          ? "unauthorized"
          : "legal_unavailable",
        currentStatus === "unauthenticated"
          ? "ログインが必要です。"
          : "正式文書を準備中のため、現在は同意できません。",
      );
    }

    const { error: consentError } = await supabase.rpc(
      "accept_legal_documents",
      {
        p_privacy_content_hash: parsedInput.data.privacyContentHash,
        p_privacy_document_id: parsedInput.data.privacyDocumentId,
        p_terms_content_hash: parsedInput.data.termsContentHash,
        p_terms_document_id: parsedInput.data.termsDocumentId,
      },
    );

    if (consentError) {
      if (consentError.code === "P0001") {
        return errorResponse(
          409,
          "legal_documents_changed",
          "法務文書が更新されました。内容を再確認してください。",
        );
      }

      return errorResponse(
        500,
        "internal_error",
        "同意を記録できませんでした。時間をおいてもう一度お試しください。",
      );
    }

    const nextStatus = await getOnboardingStatus();

    if (nextStatus !== "organization_required" && nextStatus !== "completed") {
      return errorResponse(
        409,
        "legal_documents_changed",
        "法務文書の状態が変更されました。内容を再確認してください。",
      );
    }

    return NextResponse.json(
      { data: { status: nextStatus } },
      { headers: responseHeaders },
    );
  } catch {
    return errorResponse(
      500,
      "internal_error",
      "同意を記録できませんでした。時間をおいてもう一度お試しください。",
    );
  }
}
