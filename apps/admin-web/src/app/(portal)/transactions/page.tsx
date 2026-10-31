import { Suspense } from "react";

import { TransactionsView } from "../../../components/transactions/TransactionsView";

export default function TransactionsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Chargement des transactions…</p>}>
      <TransactionsView />
    </Suspense>
  );
}
