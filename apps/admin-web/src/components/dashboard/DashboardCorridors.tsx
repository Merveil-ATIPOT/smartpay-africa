import { DASHBOARD_ILLUSTRATIVE_LABEL, DEMO_CORRIDOR_NOTE, DEMO_CORRIDORS } from "../../lib/dashboardDemo";

export function DashboardCorridors() {
  return (
    <section className="flex h-full flex-col rounded-xl bg-white p-3.5 shadow-card">
      <div className="mb-0.5 flex items-center justify-between gap-2">
        <h2 className="whitespace-nowrap font-display text-base font-semibold text-navy">Corridors &amp; Utilisateurs</h2>
        <span className="shrink-0 rounded-full bg-blue-low px-2 py-0.5 text-[10px] font-semibold text-muted">
          {DASHBOARD_ILLUSTRATIVE_LABEL}
        </span>
      </div>
      <p className="mb-3 text-xs text-muted">Répartition fictive des 1 248 comptes simulés. Ce n&apos;est pas un extrait Django.</p>
      <div className="flex flex-col gap-2.5">
        {DEMO_CORRIDORS.map((item) => (
          <div key={item.id}>
            <div className="mb-1 grid grid-cols-[1fr_auto] items-baseline gap-2 text-sm">
              <span className="truncate font-semibold text-navy">
                {item.flag} · {item.label}
              </span>
              <span className="tabular-nums text-sm font-semibold">
                {item.percent} %{" "}
                <span className="text-[11px] font-normal text-muted">({item.count})</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-blue-low">
              <div className={`h-full rounded-full ${item.barClass}`} style={{ width: `${item.percent}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg bg-blue-low p-2.5">
        <p className="text-sm font-semibold text-navy">Corridor démo</p>
        <p className="mt-0.5 text-xs leading-5 text-muted">{DEMO_CORRIDOR_NOTE}</p>
      </div>
    </section>
  );
}
