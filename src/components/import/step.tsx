/** A numbered step of the import, like a line in a form. */
export function Step({ n, title, children, aside }: { n: number; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 sm:px-5">
        <span className="num flex h-6 w-6 items-center justify-center rounded-sm bg-foreground text-xs font-semibold text-background">{n}</span>
        <h2 className="flex-1 text-sm font-semibold">{title}</h2>
        {aside}
      </header>
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </section>
  )
}
