import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-input bg-surface placeholder:text-muted-foreground h-10 w-full min-w-0 rounded-lg border px-3 py-2 text-base transition-[border-color,box-shadow] duration-150 outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none sm:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
