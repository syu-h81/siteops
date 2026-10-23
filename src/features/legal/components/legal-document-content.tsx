import { Fragment } from "react";

import { cn } from "@/lib/utils";

type LegalDocumentContentProps = {
  content: string;
};

function renderLine(line: string) {
  const heading = /^(#{1,3})\s+(.+)$/.exec(line);

  if (heading) {
    const level = heading[1]?.length ?? 1;
    const text = heading[2];
    const className = cn(
      "text-foreground scroll-mt-6 font-semibold",
      level === 1 && "mt-8 text-xl leading-7 first:mt-0",
      level === 2 && "mt-8 text-lg leading-7",
      level === 3 && "mt-6 text-base leading-6",
    );

    return level === 1 ? (
      <h2 className={className}>{text}</h2>
    ) : level === 2 ? (
      <h3 className={className}>{text}</h3>
    ) : (
      <h4 className={className}>{text}</h4>
    );
  }

  if (line.startsWith("> ")) {
    return (
      <blockquote className="border-warning text-muted-foreground border-l-4 pl-4 leading-7">
        {line.slice(2)}
      </blockquote>
    );
  }

  const unorderedItem = /^\s*-\s+(.+)$/.exec(line);

  if (unorderedItem) {
    return (
      <p className="flex gap-3 leading-7">
        <span aria-hidden="true">•</span>
        <span className="min-w-0">{unorderedItem[1]}</span>
      </p>
    );
  }

  const orderedItem = /^(\s*)(\d+)\.\s+(.+)$/.exec(line);

  if (orderedItem) {
    return (
      <p className={cn("flex gap-3 leading-7", orderedItem[1] && "pl-5")}>
        <span className="shrink-0" aria-hidden="true">
          {orderedItem[2]}.
        </span>
        <span className="min-w-0">{orderedItem[3]}</span>
      </p>
    );
  }

  if (!line.trim()) {
    return <div className="h-2" aria-hidden="true" />;
  }

  return <p className="leading-7 break-words">{line}</p>;
}

export function LegalDocumentContent({ content }: LegalDocumentContentProps) {
  return (
    <div className="space-y-2 text-sm break-words sm:text-base">
      {content.split(/\r?\n/).map((line, index) => (
        <Fragment key={`${index}-${line.slice(0, 24)}`}>
          {renderLine(line)}
        </Fragment>
      ))}
    </div>
  );
}
