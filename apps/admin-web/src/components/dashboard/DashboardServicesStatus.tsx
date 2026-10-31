import { DEMO_SERVICES } from "../../lib/dashboardDemo";

export function DashboardServicesStatus() {
  return (
    <section className="rounded-xl bg-white p-3.5 shadow-card">
      <div className="mb-3 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-base font-semibold text-navy">État Technique des Services (Banc d&apos;essai)</h2>
          <p className="text-xs text-muted">Aucune sonde de supervision n&apos;est branchée dans WA.2.</p>
        </div>
        <span className="inline-flex self-start rounded-full bg-blue-low px-2.5 py-0.5 text-[11px] font-semibold text-muted">
          Non vérifié
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-4">
        {DEMO_SERVICES.map((item) => (
          <article key={item.id} className="rounded-lg bg-blue-low p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold leading-4 text-navy">{item.name}</p>
              <span className="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-muted">{item.statusLabel}</span>
            </div>
            <p className="mt-1 font-mono text-[11px] leading-4 text-muted">{item.detail}</p>
            <p className="mt-2 border-t border-white pt-1.5 text-[11px] leading-4 text-muted">{item.footnote}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
