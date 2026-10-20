import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type AlertProps = ComponentProps<"div"> & {
  variant?: "default" | "destructive" | "info" | "success" | "warning";
};

function Alert({ className, role, variant = "default", ...props }: AlertProps) {
  return (
    <div
      role={role ?? (variant === "destructive" ? "alert" : "status")}
      data-slot="alert"
      className={cn(
        "border-border bg-surface text-foreground rounded-lg border px-4 py-3 text-sm leading-[1.6]",
        variant === "destructive" &&
          "border-destructive-border bg-destructive-muted text-destructive-text",
        variant === "success" &&
          "border-success-border bg-success-muted text-success-text",
        variant === "warning" &&
          "border-warning-border bg-warning-muted text-warning-text",
        variant === "info" && "border-info-border bg-info-muted text-info-text",
        className,
      )}
      {...props}
    />
  );
}

export { Alert };
