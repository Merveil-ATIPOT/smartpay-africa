/** Empêche un second paiement tant que le premier n'est pas terminé. */
export class ConfirmLock {
  private inFlight = false;

  get locked(): boolean {
    return this.inFlight;
  }

  tryAcquire(): boolean {
    if (this.inFlight) {
      return false;
    }
    this.inFlight = true;
    return true;
  }

  release(): void {
    this.inFlight = false;
  }
}

export function newIdempotencyKey(now = Date.now()): string {
  const rand = Math.random().toString(36).slice(2, 12);
  return `p03-${now}-${rand}`;
}
