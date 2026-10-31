import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ApiError } from "./errors";
import {
  REGISTER_PATH,
  createRegisterApiCall,
  isPaymentOrLightningPath,
  registerUserFacingError,
  type RegisterFormValues,
} from "../lib/registerForm";

const valid: RegisterFormValues = {
  firstName: "Awa",
  lastName: "Diallo",
  country: "SN",
  phone: "778492011",
  email: "awa@example.sn",
  password: "Teranga-Demo-42!",
  acceptedTerms: true,
};

describe("service d'inscription", () => {
  it("prépare POST /api/v1/auth/register/ sans JWT ni rôle", () => {
    const call = createRegisterApiCall(valid);
    assert.equal(call.path, REGISTER_PATH);
    assert.equal(call.method, "POST");
    assert.equal(call.auth, false);
    assert.equal("role" in call.body, false);
    assert.equal("is_staff" in call.body, false);
    assert.equal("is_superuser" in call.body, false);
    assert.equal("is_active" in call.body, false);
    assert.equal("access" in call.body, false);
    assert.equal(call.body.accepted_terms, true);
  });

  it("n'appelle pas une API de paiement ou Lightning", () => {
    const call = createRegisterApiCall(valid);
    assert.equal(isPaymentOrLightningPath(call.path), false);
    assert.match(call.path, /\/auth\/register\/$/);
  });

  it("propage HTTP 400 et 429 vers un message utilisateur", () => {
    const bad = registerUserFacingError(
      new ApiError(400, "Erreur API (400).", {
        error: true,
        status_code: 400,
        detail: { phone_number: ["Le numéro +221 doit contenir 9 chiffres nationaux."] },
      }),
    );
    assert.match(bad, /chiffres nationaux/);
    const limited = registerUserFacingError(new ApiError(429, "Request was throttled"));
    assert.match(limited, /Trop de tentatives/);
  });
});
