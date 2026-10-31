"use client";

import {
  DEMO_OPERATIONS,
  DEMO_OP_FILTERS,
  DEMO_OP_STATUS_LABEL,
  OPERATIONS_PAGE_SIZE,
  downloadJson,
  exportOperationsJson,
  filterOperations,
  formatDemoNumber,
  paginateOperations,
  shortenReference,
  type DemoOpType,
} from "../../lib/dashboardDemo";

function statusClass(status: keyof typeof DEMO_OP_STATUS_LABEL): string {
  if (status === "running") {
    return "bg-amber-50 text-[#B54708]";
  }
  if (status === "invoice") {
    return "bg-blue-low text-navy";
  }
  if (status === "fictive") {
    return "bg-[#FFDCBF] text-[#6B3B00]";
  }
  return "bg-green/10 text-green";
}

export function DashboardOperationsTable({
  filter,
  page,
  onFilterChange,
  onPageChange,
}: {
  filter: "all" | DemoOpType;
  page: number;
  onFilterChange: (filter: "all" | DemoOpType) => void;
  onPageChange: (page: number) => void;
}) {
  const filtered = filterOperations(DEMO_OPERATIONS, filter);
  const { rows, pages, total, page: safePage } = paginateOperations(filtered, page, OPERATIONS_PAGE_SIZE);

  function exportJson() {
    const stamp = new Date().toISOString();
    downloadJson("smartpay-w02-operations-demo.json", exportOperationsJson(filtered, stamp));
  }

  return (
    <section className="rounded-xl bg-white p-3.5 shadow-card">
      <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-base font-semibold text-navy">Dernières Opérations Simulées (Regtest)</h2>
          <p className="text-xs text-muted">Identifiants locaux de démonstration — pas des hashes Bitcoin confirmés.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-muted">
            Filtre
            <select
              value={filter}
              onChange={(event) => onFilterChange(event.target.value as "all" | DemoOpType)}
              className="rounded-lg bg-blue-low px-2 py-1 text-sm text-navy outline-none"
            >
              {DEMO_OP_FILTERS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={exportJson} className="rounded-lg bg-blue-low px-2.5 py-1 text-xs font-semibold text-navy">
            Exporter JSON
          </button>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-[13px]">
          <thead>
            <tr className="bg-blue-low text-[10px] font-semibold uppercase tracking-wider text-muted">
              <th className="whitespace-nowrap rounded-l-lg px-2.5 py-1.5">Horodatage</th>
              <th className="whitespace-nowrap px-2.5 py-1.5">Référence</th>
              <th className="whitespace-nowrap px-2.5 py-1.5">Type d&apos;opération</th>
              <th className="whitespace-nowrap px-2.5 py-1.5">Montant</th>
              <th className="whitespace-nowrap px-2.5 py-1.5">Statut</th>
              <th className="whitespace-nowrap px-2.5 py-1.5">Corridor</th>
              <th className="whitespace-nowrap rounded-r-lg px-2.5 py-1.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-line last:border-0">
                <td className="whitespace-nowrap px-2.5 py-1.5 text-xs text-muted">
                  {row.timeLabel}
                  <span className="ml-1 text-[10px]">{row.clock}</span>
                </td>
                <td className="whitespace-nowrap px-2.5 py-1.5 font-mono text-xs" title={row.reference}>
                  {shortenReference(row.reference, 20)}
                </td>
                <td className="px-2.5 py-1.5">
                  <p className="font-medium leading-4 text-navy">{row.typeLabel}</p>
                  <p className="text-[11px] leading-4 text-muted">{row.detail}</p>
                </td>
                <td className="whitespace-nowrap px-2.5 py-1.5">
                  <p className="font-semibold leading-4">{formatDemoNumber(row.amountSats)} SATS</p>
                  <p className="text-[11px] leading-4 text-orange">≈ {formatDemoNumber(row.amountFcfa)} FCFA (fictif)</p>
                </td>
                <td className="whitespace-nowrap px-2.5 py-1.5">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass(row.status)}`}>
                    {DEMO_OP_STATUS_LABEL[row.status]}
                  </span>
                </td>
                <td className="px-2.5 py-1.5">
                  <p className="whitespace-nowrap font-medium leading-4">{row.corridor}</p>
                  <p className="text-[11px] leading-4 text-muted">{row.corridorMeta}</p>
                </td>
                <td className="whitespace-nowrap px-2.5 py-1.5 text-right">
                  <button
                    type="button"
                    disabled
                    title="Détail W03 non intégré"
                    className="rounded-lg bg-blue-low px-2 py-0.5 text-[11px] font-semibold text-muted"
                  >
                    W03 indisponible
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-col gap-2 border-t border-line pt-2 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          Affichage de {rows.length} simulation(s) sur {total} (page {safePage}/{pages})
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
            className="rounded-lg bg-blue-low px-2 py-1 font-medium disabled:opacity-40"
          >
            Précédent
          </button>
          {Array.from({ length: pages }, (_, index) => index + 1).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={`rounded-lg px-2 py-1 font-medium ${item === safePage ? "bg-navy text-white" : "bg-blue-low"}`}
            >
              {item}
            </button>
          ))}
          <button
            type="button"
            disabled={safePage >= pages}
            onClick={() => onPageChange(safePage + 1)}
            className="rounded-lg bg-blue-low px-2 py-1 font-medium disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      </div>
    </section>
  );
}
