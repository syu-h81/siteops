"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { LoadingIndicator } from "@/components/ui/loading-indicator";

type SubmitButtonProps = {
  children: string;
  pendingLabel: string;
};

export function SubmitButton({ children, pendingLabel }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="h-10 sm:h-9"
    >
      {pending ? <LoadingIndicator label={pendingLabel} /> : children}
    </Button>
  );
}
