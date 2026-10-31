import { DASHBOARD_DEMO_DISCLAIMER } from "../../lib/dashboardDemo";

export function DashboardBanner({ onReset }: { onReset: () => void }) {
  return (
    <div className="mb-4 flex flex-col gap-2 rounded-xl bg-orange/10 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange text-sm font-bold text-white">
          ⚡
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <h1 className="font-display text-base font-semibold leading-5 text-navy">Environnement de Démonstration Regtest</h1>
            <span className="rounded-full bg-[#FFDCBF] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#6B3B00]">
              Sandbox Hackathon 2026
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted">{DASHBOARD_DEMO_DISCLAIMER}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="self-start whitespace-nowrap rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-navy shadow-card sm:self-auto"
      >
        Réinitialiser l&apos;illustration
      </button>
    </div>
  );
}
