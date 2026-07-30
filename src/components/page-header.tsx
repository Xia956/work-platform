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
    <header className="mb-4 flex flex-col gap-3 border-b border-[#d9d1c5] pb-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:pb-7">
      <div>
        {eyebrow ? (
          <p className="mb-1.5 text-[9px] font-semibold tracking-[0.2em] text-[#a84f35] uppercase sm:mb-2 sm:text-[10px]">{eyebrow}</p>
        ) : null}
        <h1 className="editorial-title text-[28px] leading-tight text-[#25231f] sm:text-[38px]">{title}</h1>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-5 text-[#6f6a61] sm:mt-2 sm:text-[15px] sm:leading-6">{description}</p>
      </div>
      {action}
    </header>
  );
}
