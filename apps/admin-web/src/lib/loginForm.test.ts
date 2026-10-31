import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  LOGIN_EMAIL_PLACEHOLDER,
  LOGIN_PASSWORD_PLACEHOLDER,
  containsSensitiveAuthText,
  loginUserFacingError,
  validateLoginFields,
} from "./loginForm";

describe("formulaire W01", () => {
  it("valide e-mail et mot de passe sans préremplissage", () => {
    assert.equal(validateLoginFields("", "x"), "Saisissez une adresse e-mail.");
    assert.equal(validateLoginFields("pas-un-email", "x"), "Adresse e-mail invalide.");
    assert.equal(validateLoginFields("ops@example.local", ""), "Saisissez le mot de passe.");
    assert.equal(validateLoginFields("ops@example.local", "secret-local"), null);
    assert.equal(LOGIN_EMAIL_PLACEHOLDER.includes("@"), false);
    assert.equal(LOGIN_PASSWORD_PLACEHOLDER.includes("•"), false);
  });

  it("masque les erreurs sensibles", () => {
    assert.equal(loginUserFacingError(401), "Identifiants incorrects.");
    assert.equal(loginUserFacingError(403), "Ce compte n'est pas autorisé à administrer le portail.");
    assert.match(loginUserFacingError(0), /injoignable/i);
    assert.equal(containsSensitiveAuthText("Bearer eyJabc.def"), true);
    assert.equal(containsSensitiveAuthText("hackathon2026"), true);
    assert.equal(containsSensitiveAuthText("Identifiants incorrects."), false);
  });
});
