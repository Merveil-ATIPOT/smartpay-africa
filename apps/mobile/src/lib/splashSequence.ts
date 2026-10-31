/** Durée visuelle de M01 pour une nouvelle session d'exécution. */
export const SPLASH_DURATION_MS = 5000;
/** Coupure courte si le système demande moins de mouvement. */
export const SPLASH_REDUCED_MOTION_MS = 280;

let playedThisProcess = false;

export function hasPlayedSplashThisProcess(): boolean {
  return playedThisProcess;
}

export function markSplashPlayed(): void {
  playedThisProcess = true;
}

export function resetSplashSessionForTests(): void {
  playedThisProcess = false;
}

export function splashHoldMs(reduceMotion: boolean, alreadyPlayed = false): number {
  if (alreadyPlayed) {
    return 0;
  }
  return reduceMotion ? SPLASH_REDUCED_MOTION_MS : SPLASH_DURATION_MS;
}

/** On ne quitte M01 qu'après vérification JWT et fin de la séquence. */
export function canLeaveSplash(authReady: boolean, animationDone: boolean): boolean {
  return authReady && animationDone;
}
