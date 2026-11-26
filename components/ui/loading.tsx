import { LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

export function LoadingIndicator({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}): ReactNode {
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-2 ${className}`.trim()}
    >
      <LoaderCircle
        aria-hidden="true"
        className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none"
      />
      <span>{label}</span>
    </span>
  );
}

export function Skeleton({
  className = "",
}: {
  className?: string;
}): ReactNode {
  return (
    <span
      aria-hidden="true"
      className={`bg-foreground/10 block animate-pulse rounded-md motion-reduce:animate-none ${className}`.trim()}
    />
  );
}
