import { Inbox } from "lucide-react";
import { Card } from "@/components/ui/card";

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="flex flex-col items-center justify-center px-5 py-6 text-center sm:min-h-52 sm:px-6 sm:py-10">
      <div className="mb-3 grid size-10 place-items-center rounded-control bg-surface-muted text-ink-subtle sm:mb-4 sm:size-12">
        <Inbox className="size-5" />
      </div>
      <p className="type-card-title">{title}</p>
      <p className="type-body-sm mt-2 max-w-sm text-ink-muted">{description}</p>
    </Card>
  );
}
