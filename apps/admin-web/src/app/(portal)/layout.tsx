"use client";

import type { ReactNode } from "react";

import { AdminShell } from "../../components/AdminShell";
import { RequireAdmin } from "../../components/AuthProvider";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAdmin>
      <AdminShell>{children}</AdminShell>
    </RequireAdmin>
  );
}
