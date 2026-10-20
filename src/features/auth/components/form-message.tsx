import { Alert } from "@/components/ui/alert";

type FormMessageProps = {
  message?: string | null;
  variant?: "destructive" | "success";
};

export function FormMessage({
  message,
  variant = "destructive",
}: FormMessageProps) {
  if (!message) {
    return null;
  }

  return <Alert variant={variant}>{message}</Alert>;
}
