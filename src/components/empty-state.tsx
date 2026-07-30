import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="paper flex min-h-52 flex-col items-center justify-center rounded-3xl px-6 py-10 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-[#f2ede4] text-[#8c8274]">
        <Inbox className="size-5" />
      </div>
      <p className="font-bold">{title}</p>
      <p className="mt-2 max-w-sm text-sm leading-6 text-[#706b62]">{description}</p>
    </div>
  );
}
