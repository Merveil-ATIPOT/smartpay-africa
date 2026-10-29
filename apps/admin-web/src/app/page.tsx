import type { HealthResponse } from "@smartpay/contracts";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function loadHealth(): Promise<HealthResponse | null> {
  try {
    const response = await fetch(`${API_URL}/api/v1/health/`, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as HealthResponse;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const health = await loadHealth();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-16">
      <p className="text-sm uppercase tracking-[0.2em] text-gold">SmartPay Africa</p>
      <h1 className="text-4xl font-semibold">Administration — phase P01</h1>
      <p className="text-stone-300">
        Squelette Next.js. Les écrans métier Stitch ne sont pas développés dans cette phase.
        Réseau Bitcoin : Regtest. Fournisseur de paiement : Mock.
      </p>
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="mb-3 text-lg font-medium">Santé de l&apos;API</h2>
        {health ? (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <dt>Statut</dt>
            <dd>{health.status}</dd>
            <dt>Base</dt>
            <dd>{health.database}</dd>
            <dt>Lightning</dt>
            <dd>{health.lightning}</dd>
            <dt>Fournisseur</dt>
            <dd>{health.payment_provider}</dd>
          </dl>
        ) : (
          <p className="text-sm text-stone-400">
            API injoignable sur {API_URL}. Démarrer le backend puis recharger.
          </p>
        )}
      </section>
    </main>
  );
}
