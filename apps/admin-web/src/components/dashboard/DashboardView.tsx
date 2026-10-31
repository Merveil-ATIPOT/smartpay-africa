"use client";

import { useState } from "react";

import type { ActivityPeriod, DemoOpType } from "../../lib/dashboardDemo";
import { DashboardActivityChart } from "./DashboardActivityChart";
import { DashboardBanner } from "./DashboardBanner";
import { DashboardCorridors } from "./DashboardCorridors";
import { DashboardOperationsTable } from "./DashboardOperationsTable";
import { DashboardServicesStatus } from "./DashboardServicesStatus";
import { DashboardStatCards } from "./DashboardStatCards";

export function DashboardView() {
  const [period, setPeriod] = useState<ActivityPeriod>("week");
  const [filter, setFilter] = useState<"all" | DemoOpType>("all");
  const [page, setPage] = useState(1);

  function resetIllustration() {
    setPeriod("week");
    setFilter("all");
    setPage(1);
  }

  return (
    <div className="mx-auto max-w-[1280px]">
      <DashboardBanner onReset={resetIllustration} />
      <DashboardStatCards />
      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <DashboardActivityChart period={period} onPeriodChange={setPeriod} />
        </div>
        <div className="lg:col-span-4">
          <DashboardCorridors />
        </div>
      </div>
      <div className="mb-4">
        <DashboardOperationsTable
          filter={filter}
          page={page}
          onFilterChange={(next) => {
            setFilter(next);
            setPage(1);
          }}
          onPageChange={setPage}
        />
      </div>
      <DashboardServicesStatus />
    </div>
  );
}
