import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function PageTitle({ className, ...props }: ComponentProps<"h1">) {
  return (
    <h1
      data-slot="page-title"
      className={cn("text-2xl leading-[1.3] font-bold", className)}
      {...props}
    />
  );
}

function SectionTitle({ className, ...props }: ComponentProps<"h2">) {
  return (
    <h2
      data-slot="section-title"
      className={cn("text-lg leading-[1.3] font-semibold", className)}
      {...props}
    />
  );
}

export { PageTitle, SectionTitle };
