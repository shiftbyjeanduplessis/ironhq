export function TableCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-slate-300">{description}</p>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}
