type AuthErrorLike = {
  code?: string;
  message?: string;
};

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  email_not_confirmed:
    "メールアドレスの確認が完了していません。確認メールをご確認ください。",
  invalid_credentials: "メールアドレスまたはパスワードが正しくありません。",
  over_email_send_rate_limit:
    "メールの送信回数が上限に達しました。しばらく待ってからお試しください。",
  over_request_rate_limit:
    "リクエストが多すぎます。しばらく待ってからお試しください。",
  same_password: "現在とは異なるパスワードを設定してください。",
  session_not_found:
    "認証セッションを確認できません。再設定メールをもう一度送信してください。",
  user_already_exists:
    "このメールアドレスは既に登録されている可能性があります。ログインをお試しください。",
  user_banned: "このアカウントは現在利用できません。",
  weak_password: "より安全なパスワードを設定してください。",
};

export function getAuthErrorMessage(
  error: AuthErrorLike | null | undefined,
  fallback = "認証処理に失敗しました。時間をおいてもう一度お試しください。",
) {
  if (!error) {
    return fallback;
  }

  if (error.code && AUTH_ERROR_MESSAGES[error.code]) {
    return AUTH_ERROR_MESSAGES[error.code];
  }

  return fallback;
}
