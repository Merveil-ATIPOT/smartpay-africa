/** B3 : préparation API autorisée, paiement Lightning interdit. */
export const TRANSFER_CONFIRM_ENABLED = false;

export const TRANSFER_CONFIRM_BLOCKED_MESSAGE =
  "Aucun paiement Lightning n'est effectué. La préparation est enregistrée sans paiement réel.";

export const SIMULATED_MM_DISCLAIMER =
  "Crédit Mobile Money simulé — aucun FCFA réel envoyé.";

export function assertTransferConfirmAllowed(): void {
  if (!TRANSFER_CONFIRM_ENABLED) {
    throw new Error(TRANSFER_CONFIRM_BLOCKED_MESSAGE);
  }
}
