"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

type SubmitButtonProps = {
  children: string;
  pendingLabel: string;
};

export function SubmitButton({ children, pendingLabel }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="h-10">
      {pending ? (
        <LoaderCircle aria-hidden="true" className="animate-spin" />
      ) : null}
      {pending ? pendingLabel : children}
    </Button>
  );
}
