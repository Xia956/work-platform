import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="paper flex flex-col items-center justify-center rounded-lg px-5 py-6 text-center sm:min-h-52 sm:rounded-3xl sm:px-6 sm:py-10">
      <div className="mb-3 grid size-10 place-items-center rounded-xl bg-[#f2ede4] text-[#8c8274] sm:mb-4 sm:size-12 sm:rounded-2xl">
        <Inbox className="size-5" />
      </div>
      <p className="font-bold">{title}</p>
      <p className="mt-1.5 max-w-sm text-xs leading-5 text-[#706b62] sm:mt-2 sm:text-sm sm:leading-6">{description}</p>
    </div>
  );
}
