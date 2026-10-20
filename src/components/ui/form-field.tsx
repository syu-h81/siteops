import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function FormDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      data-slot="form-description"
      className={cn("text-muted-foreground text-xs leading-[1.6]", className)}
      {...props}
    />
  );
}

function FormError({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      role="alert"
      data-slot="form-error"
      className={cn("text-destructive text-sm leading-[1.6]", className)}
      {...props}
    />
  );
}

export { FormDescription, FormError };
