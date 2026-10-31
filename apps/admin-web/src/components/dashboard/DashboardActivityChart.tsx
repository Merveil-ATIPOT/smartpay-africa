import {
  ACTIVITY_PERIODS,
  DASHBOARD_FX_NOTE,
  DASHBOARD_ILLUSTRATIVE_LABEL,
  activitySeries,
  activityTotals,
  areaPath,
  chartPoints,
  formatDemoNumber,
  polylinePath,
  type ActivityPeriod,
} from "../../lib/dashboardDemo";

export function DashboardActivityChart({
  period,
  onPeriodChange,
}: {
  period: ActivityPeriod;
  onPeriodChange: (period: ActivityPeriod) => void;
}) {
  const series = activitySeries(period);
  const totals = activityTotals(period);
  const chart = chartPoints(series);
  const satsPath = areaPath(chart.sats, 180);
  const fcfaPath = areaPath(chart.fcfa, 180);

  return (
    <section className="rounded-xl bg-white p-3.5 shadow-card">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="font-display text-base font-semibold leading-5 text-navy">Activité des Transactions &amp; Simulations Regtest</h2>
            <span className="shrink-0 rounded-full bg-blue-low px-2 py-0.5 text-[10px] font-semibold text-muted">
              {DASHBOARD_ILLUSTRATIVE_LABEL}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted">Deux séries indépendantes : volume en sats et contre-valeur fictive FCFA.</p>
        </div>
        <div className="flex shrink-0 self-start rounded-lg bg-blue-low p-0.5">
          {ACTIVITY_PERIODS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onPeriodChange(item.id)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                period === item.id ? "bg-white text-navy shadow-card" : "text-muted"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 rounded-lg bg-blue-low px-3 py-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Volume sats (illustration)</p>
          <p className="font-display text-sm font-semibold text-navy">{formatDemoNumber(totals.sats)} sats</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Contre-valeur FCFA (fictive)</p>
          <p className="font-display text-sm font-semibold text-navy">{formatDemoNumber(totals.fcfa)} FCFA</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[auto_1fr_auto] gap-1.5">
        <p className="self-center text-[10px] font-semibold uppercase tracking-wider text-orange [writing-mode:vertical-rl] rotate-180">
          Sats
        </p>
        <div className="h-40 w-full min-w-0">
          <svg viewBox="0 0 600 180" className="h-full w-full overflow-visible" role="img" aria-label="Graphique illustratif sats et FCFA">
            <line x1="0" x2="600" y1="20" y2="20" stroke="#d9e3fb" strokeDasharray="4 4" />
            <line x1="0" x2="600" y1="70" y2="70" stroke="#d9e3fb" strokeDasharray="4 4" />
            <line x1="0" x2="600" y1="120" y2="120" stroke="#d9e3fb" strokeDasharray="4 4" />
            <line x1="0" x2="600" y1="170" y2="170" stroke="#d9e3fb" />
            <path d={fcfaPath} fill="url(#fcfaGradW02)" />
            <path d={areaPath(chart.sats, 180)} fill="url(#satsGradW02)" />
            <path d={polylinePath(chart.fcfa)} fill="none" stroke="#009756" strokeWidth="2.5" strokeLinecap="round" />
            <path d={polylinePath(chart.sats)} fill="none" stroke="#FE9821" strokeWidth="3" strokeLinecap="round" />
            <defs>
              <linearGradient id="satsGradW02" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#fe9821" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#fe9821" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="fcfaGradW02" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#009756" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#009756" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <p className="self-center text-[10px] font-semibold uppercase tracking-wider text-green [writing-mode:vertical-rl]">
          FCFA
        </p>
      </div>
      <div className="mt-1.5 flex justify-between gap-2 overflow-x-auto text-[11px] text-muted">
        {series.map((point) => (
          <span key={point.label} className="shrink-0">
            {point.label}
          </span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2 text-xs">
        <div className="flex flex-wrap gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-orange" /> Volume sats
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-green" /> Contre-valeur FCFA
          </span>
        </div>
        <p className="text-[11px] text-muted">{DASHBOARD_FX_NOTE}</p>
      </div>
    </section>
  );
}
