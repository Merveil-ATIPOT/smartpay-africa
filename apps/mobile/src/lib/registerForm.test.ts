import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ConfirmLock } from "./confirmLock";
import { ApiError } from "../services/errors";
import {
  DEFAULT_REGISTER_COUNTRY,
  PAYMENT_OR_LIGHTNING_PATHS,
  PRIVILEGED_REGISTER_FIELDS,
  REGISTER_COUNTRIES,
  REGISTER_MIN_PASSWORD_LENGTH,
  REGISTER_PATH,
  REGISTER_SUCCESS_NOTICE,
  REGISTER_THROTTLE_MESSAGE,
  REGISTER_UNAVAILABLE_MESSAGE,
  buildRegisterPayload,
  createRegisterApiCall,
  isPaymentOrLightningPath,
  isRegisterFormValid,
  canSubmitLogin,
  loginFieldsAfterRegister,
  loginPasswordAutoFill,
  loginRouteAfterRegister,
  passwordStrength,
  payloadHasPrivilegedFields,
  registerFieldErrors,
  registerPayloadKeys,
  registerUserFacingError,
  type RegisterFormValues,
} from "./registerForm";

const valid: RegisterFormValues = {
  firstName: "Awa",
  lastName: "Diallo",
  country: "SN",
  phone: "778492011",
  email: "awa@example.sn",
  password: "Teranga-Demo-42!",
  acceptedTerms: true,
};

describe("formulaire M04", () => {
  it("propose SN, CI et CG, Sénégal par défaut", () => {
    assert.deepEqual(
      REGISTER_COUNTRIES.map((item) => item.code),
      ["SN", "CI", "CG"],
    );
    assert.equal(DEFAULT_REGISTER_COUNTRY, "SN");
    assert.equal(REGISTER_COUNTRIES[0].dialCode, "+221");
    assert.equal(REGISTER_COUNTRIES[1].dialCode, "+225");
    assert.equal(REGISTER_COUNTRIES[2].dialCode, "+242");
  });

  it("accepte un formulaire valide SN", () => {
    assert.equal(isRegisterFormValid(valid), true);
    assert.deepEqual(registerFieldErrors(valid), {});
  });

  it("refuse un prénom ou un nom vide", () => {
    assert.ok(registerFieldErrors({ ...valid, firstName: "  " }).firstName);
    assert.ok(registerFieldErrors({ ...valid, lastName: "" }).lastName);
  });

  it("refuse un e-mail invalide", () => {
    assert.ok(registerFieldErrors({ ...valid, email: "awa" }).email);
    assert.ok(registerFieldErrors({ ...valid, email: "awa@" }).email);
  });

  it("refuse un téléphone incompatible avec le pays", () => {
    const sn = registerFieldErrors({ ...valid, country: "SN", phone: "12" });
    assert.ok(sn.phone);
    assert.match(sn.phone ?? "", /chiffres nationaux/);
    const ci = registerFieldErrors({ ...valid, country: "CI", phone: "07458912" });
    assert.equal(ci.phone, undefined);
    const ciBad = registerFieldErrors({ ...valid, country: "CI", phone: "123" });
    assert.ok(ciBad.phone);
  });

  it("refuse un mot de passe trop court, aligné sur Django (8 caractères)", () => {
    assert.equal(REGISTER_MIN_PASSWORD_LENGTH, 8);
    assert.ok(registerFieldErrors({ ...valid, password: "1234567" }).password);
    assert.equal(registerFieldErrors({ ...valid, password: "12345678" }).password, undefined);
  });

  it("refuse si la case de démonstration n'est pas cochée", () => {
    assert.ok(registerFieldErrors({ ...valid, acceptedTerms: false }).acceptedTerms);
  });
});

describe("requête POST /api/v1/auth/register/", () => {
  it("construit le payload attendu sans rôle privilégié", () => {
    const call = createRegisterApiCall({
      ...valid,
      firstName: "  Awa  Ndèye ",
      email: "  Awa@Example.SN ",
      phone: "+221 77 849 20 11",
    });
    assert.equal(call.path, REGISTER_PATH);
    assert.equal(call.method, "POST");
    assert.equal(call.auth, false);
    assert.deepEqual(call.body, {
      first_name: "Awa Ndèye",
      last_name: "Diallo",
      email: "awa@example.sn",
      password: "Teranga-Demo-42!",
      country: "SN",
      phone_number: "778492011",
      accepted_terms: true,
    });
    assert.equal("access" in call.body, false);
    assert.equal("refresh" in call.body, false);
    assert.equal(payloadHasPrivilegedFields(call.body), false);
    for (const field of PRIVILEGED_REGISTER_FIELDS) {
      assert.equal(registerPayloadKeys(call.body).includes(field), false);
    }
  });

  it("envoie le numéro national CI et CG", () => {
    assert.equal(buildRegisterPayload({ ...valid, country: "CI", phone: "07458912" }).phone_number, "07458912");
    assert.equal(buildRegisterPayload({ ...valid, country: "CG", phone: "066112233" }).phone_number, "066112233");
  });

  it("n'appelle aucune API de paiement ou Lightning", () => {
    const call = createRegisterApiCall(valid);
    assert.equal(isPaymentOrLightningPath(call.path), false);
    for (const path of PAYMENT_OR_LIGHTNING_PATHS) {
      assert.equal(call.path.includes(path), false);
    }
  });
});

describe("après inscription", () => {
  it("ouvre M05 avec l'e-mail, sans mot de passe", () => {
    const next = loginRouteAfterRegister("awa@example.sn");
    assert.equal(next.name, "Login");
    assert.equal(next.params.registeredEmail, "awa@example.sn");
    assert.equal(next.params.notice, REGISTER_SUCCESS_NOTICE);
    assert.equal(next.params.fromRegister, true);
    assert.equal("password" in next.params, false);
    const fields = loginFieldsAfterRegister("awa@example.sn");
    assert.equal(fields.password, "");
    assert.equal(fields.autofillPassword, false);
    assert.equal(loginPasswordAutoFill(true), false);
    assert.equal(canSubmitLogin(fields.email, fields.password), false);
    assert.equal(canSubmitLogin(fields.email, "saisi-explicitement"), true);
  });
});

describe("téléphone SN / CI / CG", () => {
  it("accepte national, indicatif, espaces et zéro initial justifié", () => {
    assert.equal(isRegisterFormValid({ ...valid, phone: "778492011" }), true);
    assert.equal(isRegisterFormValid({ ...valid, phone: "+221 77 849 20 11" }), true);
    assert.equal(buildRegisterPayload({ ...valid, phone: "0778492011" }).phone_number, "778492011");
    assert.equal(
      buildRegisterPayload({ ...valid, country: "CI", phone: "07 45 89 12" }).phone_number,
      "07458912",
    );
    assert.equal(
      buildRegisterPayload({ ...valid, country: "CG", phone: "+242 066112233" }).phone_number,
      "066112233",
    );
  });

  it("refuse trop court, trop long, mauvais indicatif et lettres", () => {
    assert.ok(registerFieldErrors({ ...valid, phone: "12" }).phone);
    assert.ok(registerFieldErrors({ ...valid, phone: "77849201199" }).phone);
    assert.ok(registerFieldErrors({ ...valid, phone: "+22507458912" }).phone);
    assert.ok(registerFieldErrors({ ...valid, phone: "77abc8492011" }).phone);
  });

  it("revalide le numéro si le pays change", () => {
    const snOk = { ...valid, phone: "778492011", country: "SN" as const };
    assert.equal(registerFieldErrors(snOk).phone, undefined);
    assert.ok(registerFieldErrors({ ...snOk, country: "CI" }).phone);
  });
});

describe("erreurs d'inscription", () => {
  it("affiche l'e-mail déjà utilisé et un mot de passe refusé", () => {
    const duplicate = registerUserFacingError(
      new ApiError(400, "Erreur API (400).", {
        error: true,
        status_code: 400,
        detail: { email: ["Cet e-mail est déjà utilisé."] },
      }),
    );
    assert.equal(duplicate, "Cet e-mail est déjà utilisé.");
    const weak = registerUserFacingError(
      new ApiError(400, "Erreur API (400).", {
        error: true,
        status_code: 400,
        detail: { password: ["Ce mot de passe est trop court."] },
      }),
    );
    assert.match(weak, /trop court/i);
  });

  it("traduit HTTP 429 et une coupure réseau", () => {
    assert.equal(registerUserFacingError(new ApiError(429, "throttled")), REGISTER_THROTTLE_MESSAGE);
    assert.equal(registerUserFacingError(new ApiError(0, "Réseau injoignable")), REGISTER_UNAVAILABLE_MESSAGE);
    assert.equal(registerUserFacingError(new ApiError(503, "down")), REGISTER_UNAVAILABLE_MESSAGE);
  });

  it("ne montre pas de secret ni de stack", () => {
    const hidden = registerUserFacingError(
      new ApiError(500, "Traceback (most recent call last)", { detail: "macaroon abc jwt xyz" }),
    );
    assert.equal(hidden, REGISTER_UNAVAILABLE_MESSAGE);
    assert.equal(hidden.toLowerCase().includes("macaroon"), false);
    assert.equal(hidden.toLowerCase().includes("jwt"), false);
  });
});

describe("double soumission", () => {
  it("ignore un second envoi tant que le premier n'est pas terminé", () => {
    const lock = new ConfirmLock();
    assert.equal(lock.tryAcquire(), true);
    assert.equal(lock.tryAcquire(), false);
    lock.release();
    assert.equal(lock.tryAcquire(), true);
  });
});

describe("indicateur de mot de passe", () => {
  it("reste simple et aligné sur Django", () => {
    assert.equal(passwordStrength("").score, 0);
    assert.equal(passwordStrength("123").score, 1);
    assert.equal(passwordStrength("abcdefgh").score, 2);
    assert.equal(passwordStrength("abcd1234").score, 3);
    assert.equal(passwordStrength("Teranga-42").score, 4);
  });
});
