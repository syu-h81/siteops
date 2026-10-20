import { logout } from "@/features/auth/actions";
import { SubmitButton } from "@/features/auth/components/submit-button";

export function LogoutButton() {
  return (
    <form action={logout}>
      <SubmitButton pendingLabel="ログアウト中…">ログアウト</SubmitButton>
    </form>
  );
}
