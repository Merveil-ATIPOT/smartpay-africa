/** B3 : préparation API autorisée, paiement Lightning interdit. */
export const TRANSFER_CONFIRM_ENABLED = false;

export const TRANSFER_CONFIRM_BLOCKED_MESSAGE =
  "Le paiement Lightning n'est pas autorisé pendant la phase B3. La préparation serveur est enregistrée sans confirm.";

export const SIMULATED_MM_DISCLAIMER =
  "Crédit Mobile Money simulé — aucun FCFA réel envoyé.";

export function assertTransferConfirmAllowed(): void {
  if (!TRANSFER_CONFIRM_ENABLED) {
    throw new Error(TRANSFER_CONFIRM_BLOCKED_MESSAGE);
  }
}
