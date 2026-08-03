import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type CardTone = "default" | "muted" | "ai";

export function Card({
  tone = "default",
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: CardTone }) {
  return (
    <div
      className={cn(
        "ui-card",
        tone === "muted" && "ui-card--muted",
        tone === "ai" && "ui-card--ai",
        className,
      )}
      {...props}
    />
  );
}
