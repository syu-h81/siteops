import { NextResponse, type NextRequest } from "next/server";

import { organizationSchema } from "@/features/onboarding/schemas";
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

  const parsedInput = organizationSchema.safeParse(input);

  if (!parsedInput.success) {
    return errorResponse(
      400,
      "validation_error",
      parsedInput.error.issues[0]?.message ?? "入力内容を確認してください。",
    );
  }

  try {
    const status = await getOnboardingStatus();

    if (status === "unauthenticated") {
      return errorResponse(401, "unauthorized", "ログインが必要です。");
    }

    if (status === "completed") {
      return errorResponse(409, "organization_exists", "組織は作成済みです。");
    }

    if (status !== "organization_required") {
      return errorResponse(
        409,
        "consent_required",
        "組織を作成する前に、現行の法務文書への同意が必要です。",
      );
    }

    const { data: existingOrganization, error: organizationError } =
      await supabase
        .from("organizations")
        .select("id")
        .eq("owner_user_id", user.id)
        .maybeSingle();

    if (organizationError) {
      return errorResponse(
        500,
        "internal_error",
        "組織を作成できませんでした。時間をおいてもう一度お試しください。",
      );
    }

    if (existingOrganization) {
      return errorResponse(409, "organization_exists", "組織は作成済みです。");
    }

    const { error: insertError } = await supabase.from("organizations").insert({
      name: parsedInput.data.name,
      owner_user_id: user.id,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        return errorResponse(
          409,
          "organization_exists",
          "組織は作成済みです。",
        );
      }

      return errorResponse(
        500,
        "internal_error",
        "組織を作成できませんでした。時間をおいてもう一度お試しください。",
      );
    }

    const nextStatus = await getOnboardingStatus();

    if (nextStatus !== "completed") {
      return errorResponse(
        500,
        "internal_error",
        "初期設定の完了を確認できませんでした。",
      );
    }

    return NextResponse.json(
      { data: { redirectTo: "/dashboard" } },
      { headers: responseHeaders, status: 201 },
    );
  } catch {
    return errorResponse(
      500,
      "internal_error",
      "組織を作成できませんでした。時間をおいてもう一度お試しください。",
    );
  }
}
