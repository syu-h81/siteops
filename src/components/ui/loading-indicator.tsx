import { LoaderCircle } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type LoadingIndicatorProps = ComponentProps<"span"> & {
  label?: string;
};

function LoadingIndicator({
  className,
  label = "読み込み中…",
  ...props
}: LoadingIndicatorProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn("inline-flex items-center justify-center gap-2", className)}
      {...props}
    >
      <LoaderCircle
        aria-hidden="true"
        className="size-4 motion-safe:animate-spin"
      />
      <span>{label}</span>
    </span>
  );
}

export { LoadingIndicator };
