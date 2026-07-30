export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-[#d9d1c5] pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-2 text-[10px] font-semibold tracking-[0.22em] text-[#a84f35] uppercase">{eyebrow}</p>
        ) : null}
        <h1 className="editorial-title text-3xl text-[#25231f] sm:text-[38px] sm:leading-tight">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6f6a61] sm:text-[15px]">{description}</p>
      </div>
      {action}
    </header>
  );
}
