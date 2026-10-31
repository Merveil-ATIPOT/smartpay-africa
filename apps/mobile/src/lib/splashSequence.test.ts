import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  SPLASH_DURATION_MS,
  SPLASH_REDUCED_MOTION_MS,
  canLeaveSplash,
  hasPlayedSplashThisProcess,
  markSplashPlayed,
  resetSplashSessionForTests,
  splashHoldMs,
} from "./splashSequence";

describe("séquence M01", () => {
  it("dure cinq secondes, ou une pause courte si moins de mouvement", () => {
    assert.equal(SPLASH_DURATION_MS, 5000);
    assert.equal(splashHoldMs(false), 5000);
    assert.equal(splashHoldMs(true), SPLASH_REDUCED_MOTION_MS);
    assert.ok(SPLASH_REDUCED_MOTION_MS < 500);
    assert.equal(splashHoldMs(false, true), 0);
  });

  it("attend la vérification JWT avant de quitter le splash", () => {
    assert.equal(canLeaveSplash(false, false), false);
    assert.equal(canLeaveSplash(true, false), false);
    assert.equal(canLeaveSplash(false, true), false);
    assert.equal(canLeaveSplash(true, true), true);
  });

  it("ne rejoue la séquence qu'une fois par session d'exécution", () => {
    resetSplashSessionForTests();
    assert.equal(hasPlayedSplashThisProcess(), false);
    markSplashPlayed();
    assert.equal(hasPlayedSplashThisProcess(), true);
    assert.equal(splashHoldMs(false, hasPlayedSplashThisProcess()), 0);
    resetSplashSessionForTests();
    assert.equal(hasPlayedSplashThisProcess(), false);
  });
});
