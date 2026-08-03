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
    <header className="mb-4 flex flex-col gap-3 border-b border-line pb-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:pb-7">
      <div>
        {eyebrow ? (
          <p className="type-eyebrow mb-2">{eyebrow}</p>
        ) : null}
        <h1 className="type-page-title">{title}</h1>
        <p className="type-body mt-2 max-w-2xl text-ink-muted">{description}</p>
      </div>
      {action}
    </header>
  );
}
