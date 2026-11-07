import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ApiError } from "../services/errors";
import {
  AUTHENTICATED_INITIAL_ROUTE,
  DEMO_USER_EMAIL,
  FORGOT_PASSWORD_PENDING_MESSAGE,
  LOGIN_PASSWORD_PLACEHOLDER,
  LOGIN_TITLE,
  SPLASH_TAGLINE,
  UNAUTHENTICATED_ROUTES,
  UNTOUCHED_MERCHANT_ROUTES,
  UNTOUCHED_TRANSFER_ROUTES,
  WELCOME_TAGLINE,
  demoEmailPrefill,
  loginFieldErrors,
  loginUserFacingError,
  showDevAuthTools,
} from "./authEntry";

describe("entrée M01 / M02 / M05", () => {
  it("préremplit l'e-mail de démonstration uniquement en développement", () => {
    assert.equal(demoEmailPrefill(true), "user@smartpay.local");
    assert.equal(demoEmailPrefill(false), "");
    assert.equal(DEMO_USER_EMAIL.includes("@"), true);
    assert.equal(showDevAuthTools(true), true);
    assert.equal(showDevAuthTools(false), false);
  });

  it("annonce le reset mot de passe comme non disponible", () => {
    assert.equal(FORGOT_PASSWORD_PENDING_MESSAGE, "Fonction bientôt disponible");
  });

  it("garde un accueil court et une connexion directe", () => {
    assert.equal(WELCOME_TAGLINE, "Envoyez, recevez et payez simplement.");
    assert.equal(LOGIN_TITLE, "Bon retour !");
    assert.equal(LOGIN_PASSWORD_PLACEHOLDER, "Mot de passe");
    assert.equal(LOGIN_PASSWORD_PLACEHOLDER.includes("•"), false);
    assert.equal(SPLASH_TAGLINE, "Bitcoin & Lightning au cœur de l'Afrique");
    assert.equal(UNAUTHENTICATED_ROUTES.includes("Splash" as never), false);
  });

  it("ouvre Welcome, Login et Register hors session, et Tabs une fois connecté", () => {
    assert.deepEqual([...UNAUTHENTICATED_ROUTES], ["Welcome", "Login", "Register"]);
    assert.equal(AUTHENTICATED_INITIAL_ROUTE, "Tabs");
    assert.equal(UNAUTHENTICATED_ROUTES.includes("Tabs" as never), false);
  });

  it("ne déplace pas les routes transfert ni marchand", () => {
    assert.deepEqual([...UNTOUCHED_TRANSFER_ROUTES], [
      "TransferDestination",
      "TransferBeneficiary",
      "TransferAmount",
      "TransferReview",
      "TransferResult",
    ]);
    assert.ok(UNTOUCHED_MERCHANT_ROUTES.includes("MerchantHome"));
    assert.ok(UNTOUCHED_MERCHANT_ROUTES.includes("MerchantShop"));
    for (const route of UNAUTHENTICATED_ROUTES) {
      assert.equal((UNTOUCHED_TRANSFER_ROUTES as readonly string[]).includes(route), false);
      assert.equal((UNTOUCHED_MERCHANT_ROUTES as readonly string[]).includes(route), false);
    }
  });

  it("expose une erreur de connexion sans secret", () => {
    const network = loginUserFacingError(new ApiError(0, "Réseau indisponible."));
    assert.match(network, /Réseau indisponible/);
    assert.equal(network.toLowerCase().includes("jwt"), false);
    assert.equal(network.toLowerCase().includes("macaroon"), false);
    const denied = loginUserFacingError(new ApiError(401, "Identifiants incorrects."));
    assert.equal(denied, "Identifiants incorrects.");
    const missing = {
      detail: {
        email: ["Ce champ est obligatoire."],
        password: ["Ce champ est obligatoire."],
      },
    };
    assert.deepEqual(loginFieldErrors(missing), {
      email: "Ce champ est obligatoire.",
      password: "Ce champ est obligatoire.",
    });
    const shown = loginUserFacingError(new ApiError(400, "Erreur API (400).", missing));
    assert.match(shown, /E-mail : Ce champ est obligatoire/);
    assert.match(shown, /Mot de passe : Ce champ est obligatoire/);
    assert.equal(shown.toLowerCase().includes("password"), false);
  });
});
