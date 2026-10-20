import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type AlertProps = ComponentProps<"div"> & {
  variant?: "default" | "destructive" | "success";
};

function Alert({ className, variant = "default", ...props }: AlertProps) {
  return (
    <div
      role="alert"
      data-slot="alert"
      className={cn(
        "rounded-lg border px-4 py-3 text-sm leading-6",
        variant === "destructive" &&
          "border-destructive/30 bg-destructive/10 text-destructive",
        variant === "success" &&
          "border-emerald-200 bg-emerald-50 text-emerald-800",
        className,
      )}
      {...props}
    />
  );
}

export { Alert };
