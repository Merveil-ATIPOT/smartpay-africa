import { DASHBOARD_ILLUSTRATIVE_LABEL, DEMO_STATS, formatDemoNumber } from "../../lib/dashboardDemo";

export function DashboardStatCards() {
  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <article className="rounded-xl bg-white p-3.5 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase leading-3 tracking-wider text-muted">Utilisateurs enregistrés</p>
          <span className="shrink-0 rounded-full bg-blue-low px-1.5 py-0.5 text-[10px] font-semibold text-muted">
            {DASHBOARD_ILLUSTRATIVE_LABEL}
          </span>
        </div>
        <p className="mt-1 font-display text-[28px] font-semibold leading-8 text-navy">{formatDemoNumber(DEMO_STATS.users.value)}</p>
        <p className="mt-0.5 text-xs text-muted">{DEMO_STATS.users.hint}</p>
        <p className="mt-2 text-[11px] text-muted">{DEMO_STATS.users.extra}</p>
      </article>

      <article className="rounded-xl bg-white p-3.5 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase leading-3 tracking-wider text-muted">Marchands actifs</p>
          <span className="shrink-0 rounded-full bg-[#FFDCBF] px-1.5 py-0.5 text-[10px] font-semibold text-[#6B3B00]">Simulation</span>
        </div>
        <p className="mt-1 font-display text-[28px] font-semibold leading-8 text-navy">{formatDemoNumber(DEMO_STATS.merchants.value)}</p>
        <p className="mt-0.5 text-xs text-muted">{DEMO_STATS.merchants.hint}</p>
        <p className="mt-2 text-[11px] text-muted">{DEMO_STATS.merchants.extra}</p>
      </article>

      <article className="rounded-xl bg-white p-3.5 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase leading-3 tracking-wider text-muted">Simulations de transferts</p>
          <span className="shrink-0 rounded-full bg-blue-low px-1.5 py-0.5 text-[10px] font-semibold text-muted">Transfrontaliers</span>
        </div>
        <p className="mt-1 font-display text-[28px] font-semibold leading-8 text-navy">{formatDemoNumber(DEMO_STATS.transfers.value)}</p>
        <p className="mt-0.5 text-xs text-muted">{DEMO_STATS.transfers.hint}</p>
        <p className="mt-2 text-[11px] text-muted">{DEMO_STATS.transfers.extra}</p>
      </article>

      <article className="rounded-xl bg-navy p-3.5 text-white shadow-card">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase leading-3 tracking-wider text-white/70">Capacité réseau Lightning</p>
          <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#70FDA7]">Illustration</span>
        </div>
        <p className="mt-1 font-display text-[28px] font-semibold leading-8">
          {DEMO_STATS.capacity.valueLabel} <span className="text-sm text-orange">SATS</span>
        </p>
        <p className="mt-0.5 text-xs text-white/70">{DEMO_STATS.capacity.hint}</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
          <div className="h-full bg-orange" style={{ width: `${DEMO_STATS.capacity.localPct}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-white/60">
          <span>Local illustratif {DEMO_STATS.capacity.localPct} %</span>
          <span>Distant illustratif {DEMO_STATS.capacity.remotePct} %</span>
        </div>
      </article>
    </div>
  );
}
