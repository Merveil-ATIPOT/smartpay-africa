/** Taux de démonstration fictif. Ce n'est PAS un taux de marché Bitcoin. */
export const DEMO_FCFA_PER_BTC = 43_300_000;
export const SATS_PER_BTC = 100_000_000;
export const DEMO_FEE_SATS = 1;
export const MIN_TRANSFER_FCFA = 100;

export type TransferQuote = {
  amountFcfa: number;
  amountSats: number;
  feeSats: number;
  totalSats: number;
  receivedFcfa: number;
  demoRate: true;
  rateDisclaimer: string;
  feeDisclaimer: string;
};

export const DEMO_RATE_DISCLAIMER =
  "Taux indicatif fictif (1 BTC = 43 300 000 FCFA). Aucune réservation de change. Ce n'est pas un cours Bitcoin réel.";

export const DEMO_FEE_DISCLAIMER =
  "Frais de démonstration (1 sat). Ce n'est pas une estimation LND ni des frais réseau observés.";

function asNonNegInt(value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    return 0;
  }
  return value;
}

/** Arrondi au plus proche (half-up) via arithmétique entière. */
export function fcfaToSats(amountFcfa: number): number {
  const fcfa = BigInt(asNonNegInt(amountFcfa));
  const btcFcfa = BigInt(DEMO_FCFA_PER_BTC);
  const sats = BigInt(SATS_PER_BTC);
  return Number((fcfa * sats + btcFcfa / 2n) / btcFcfa);
}

export function satsToFcfa(amountSats: number): number {
  const sats = BigInt(asNonNegInt(amountSats));
  const btcFcfa = BigInt(DEMO_FCFA_PER_BTC);
  const satsBtc = BigInt(SATS_PER_BTC);
  return Number((sats * btcFcfa + satsBtc / 2n) / satsBtc);
}

export function buildQuote(amountFcfa: number): TransferQuote {
  const fcfa = asNonNegInt(amountFcfa);
  const amountSats = fcfaToSats(fcfa);
  const feeSats = fcfa > 0 ? DEMO_FEE_SATS : 0;
  return {
    amountFcfa: fcfa,
    amountSats,
    feeSats,
    totalSats: amountSats + feeSats,
    receivedFcfa: fcfa,
    demoRate: true,
    rateDisclaimer: DEMO_RATE_DISCLAIMER,
    feeDisclaimer: DEMO_FEE_DISCLAIMER,
  };
}

export function quoteErrors(amountFcfa: number, availableSats: number): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(amountFcfa) || amountFcfa < MIN_TRANSFER_FCFA) {
    errors.push(`Saisissez un montant entier d'au moins ${MIN_TRANSFER_FCFA} FCFA.`);
  }
  const quote = buildQuote(Math.max(0, amountFcfa));
  if (Number.isInteger(amountFcfa) && amountFcfa >= MIN_TRANSFER_FCFA && quote.totalSats > availableSats) {
    errors.push("Solde disponible insuffisant pour ce montant de démonstration.");
  }
  return errors;
}

/** Plus grand montant FCFA entier dont le total (conversion + frais démo) tient dans le solde. */
export function maxFcfaForBalance(availableSats: number): number {
  const spendable = Math.max(0, asNonNegInt(availableSats) - DEMO_FEE_SATS);
  let fcfa = satsToFcfa(spendable);
  while (fcfa > 0 && buildQuote(fcfa).totalSats > availableSats) {
    fcfa -= 1;
  }
  return fcfa;
}
