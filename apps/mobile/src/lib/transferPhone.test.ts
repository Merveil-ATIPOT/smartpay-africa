import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatInternational, nationalNumber, operatorAllowed, phoneErrors } from "./transferPhone";

describe("M23 téléphone", () => {
  it("accepte un numéro sénégalais à 9 chiffres, avec ou sans indicatif", () => {
    assert.equal(phoneErrors("SN", "771234567").length, 0);
    assert.equal(phoneErrors("SN", "+221771234567").length, 0);
    assert.equal(nationalNumber("+221 77 123 45 67", "+221"), "771234567");
    assert.equal(formatInternational("SN", "771234567"), "+221 771234567");
  });

  it("accepte 8 ou 10 chiffres pour la Côte d'Ivoire", () => {
    assert.equal(phoneErrors("CI", "07458912").length, 0);
    assert.equal(phoneErrors("CI", "0107458912").length, 0);
    assert.ok(phoneErrors("CI", "123").length > 0);
  });

  it("refuse un numéro trop court sans prétendre vérifier le compte", () => {
    const message = phoneErrors("CG", "06").join(" ");
    assert.match(message, /chiffres nationaux/);
    assert.match(message, /Aucun compte Mobile Money n'est interrogé/);
  });

  it("refuse un opérateur incompatible avec le pays", () => {
    assert.equal(operatorAllowed("SN", "wave"), true);
    assert.equal(operatorAllowed("SN", "airtel"), false);
    assert.equal(operatorAllowed("CG", "mtn"), true);
    assert.equal(operatorAllowed("FR", "wave"), false);
  });
});
