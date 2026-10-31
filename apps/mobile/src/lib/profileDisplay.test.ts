import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { UserProfile } from "@smartpay/contracts";

import { AUTHENTICATED_INITIAL_ROUTE, UNAUTHENTICATED_ROUTES, UNTOUCHED_MERCHANT_ROUTES } from "./authEntry";
import { isPaymentOrLightningPath } from "./registerForm";
import {
  PROFILE_DEFERRED_NOTE,
  PROFILE_DEFERRED_SECTIONS,
  PROFILE_LOGOUT,
  PROFILE_ME_PATH,
  PROFILE_MERCHANT_CTA,
  PROFILE_MERCHANT_HINT,
  PROFILE_MERCHANT_NAVIGATION,
  PROFILE_REGTEST_BADGE,
  formatJoinedDate,
  profileAccountStatus,
  profileCopyHasForbiddenClaim,
  profileCountryLine,
  profileDisplayName,
  profileInfoRows,
  profileInitials,
  profileMerchantLeavesRoleUntouched,
  profileRoleLabel,
  profileUsesMeEndpointOnly,
  visibleProfileCopy,
} from "./profileDisplay";

const sample: UserProfile = {
  id: 2,
  email: "user@smartpay.local",
  first_name: "Awa",
  last_name: "Ndiaye",
  phone_number: "+221778492011",
  role: "individual",
  country: "SN",
  is_active: true,
  date_joined: "2026-03-12T10:00:00Z",
};

describe("profil M36 — affichage GET /me/", () => {
  it("compose le nom, les initiales et le pays depuis le profil réel", () => {
    assert.equal(profileDisplayName(sample), "Awa Ndiaye");
    assert.equal(profileInitials(sample), "AN");
    assert.equal(profileCountryLine("SN"), "Dakar, Sénégal");
    assert.equal(profileCountryLine("CI"), "Abidjan, Côte d'Ivoire");
    assert.equal(profileCountryLine("CG"), "Brazzaville, Congo");
    assert.equal(profileRoleLabel("individual"), "Particulier");
    assert.equal(profileAccountStatus(true), "Actif");
  });

  it("retombe sur l'e-mail si le nom est vide", () => {
    const unnamed: UserProfile = { ...sample, first_name: "", last_name: "" };
    assert.equal(profileDisplayName(unnamed), "user");
    assert.equal(profileInitials(unnamed), "US");
  });

  it("expose uniquement des lignes issues de /me/", () => {
    const rows = profileInfoRows(sample);
    assert.deepEqual(
      rows.map((row) => row.key),
      ["email", "country", "role", "phone", "joined", "status"],
    );
    assert.equal(rows.find((row) => row.key === "email")?.value, sample.email);
    assert.equal(rows.find((row) => row.key === "role")?.value, "Particulier");
    assert.equal(rows.find((row) => row.key === "country")?.value, "Dakar, Sénégal");
    assert.match(rows.find((row) => row.key === "phone")?.value ?? "", /\+221/);
    assert.equal(formatJoinedDate(sample.date_joined).includes("2026"), true);
    const noPhone = profileInfoRows({ ...sample, phone_number: "  " });
    assert.equal(noPhone.some((row) => row.key === "phone"), false);
  });

  it("n'invente ni KYC, ni score, ni adresse Lightning, ni volume", () => {
    const copy = visibleProfileCopy(sample);
    assert.match(copy, /Mode Démonstration · Regtest/);
    assert.equal(profileCopyHasForbiddenClaim(copy), false);
    assert.equal(copy.toLowerCase().includes("niveau 2"), false);
    assert.equal(copy.toLowerCase().includes("kyc"), false);
    assert.equal(copy.toLowerCase().includes("score 100"), false);
    assert.equal(copy.toLowerCase().includes("1.8m"), false);
    assert.equal(copy.toLowerCase().includes("adresse lightning"), false);
    assert.equal(copy.toLowerCase().includes("face id"), false);
    assert.equal(copy.toLowerCase().includes("wave"), false);
    assert.match(PROFILE_REGTEST_BADGE, /Regtest/);
  });

  it("ne lit que GET /me/ et n'appelle pas un chemin paiement ou LND", () => {
    assert.equal(profileUsesMeEndpointOnly(PROFILE_ME_PATH), true);
    assert.equal(isPaymentOrLightningPath(PROFILE_ME_PATH), false);
    assert.equal(PROFILE_ME_PATH.includes("/payments/"), false);
    assert.equal(PROFILE_ME_PATH.includes("/invoices/"), false);
    assert.equal(PROFILE_ME_PATH.includes("/lab/"), false);
    assert.equal(PROFILE_ME_PATH.includes("/confirm/"), false);
  });
});

describe("profil M36 — Espace Marchand et déconnexion", () => {
  it("ouvre la route marchande existante sans changer le rôle", () => {
    assert.equal(PROFILE_MERCHANT_NAVIGATION.route, "Merchant");
    assert.equal(PROFILE_MERCHANT_NAVIGATION.mutatesRole, false);
    assert.equal(PROFILE_MERCHANT_NAVIGATION.createsMerchant, false);
    assert.equal(PROFILE_MERCHANT_NAVIGATION.callsDjangoMerchant, false);
    assert.equal(profileMerchantLeavesRoleUntouched("individual"), "individual");
    assert.equal(UNTOUCHED_MERCHANT_ROUTES.includes(PROFILE_MERCHANT_NAVIGATION.route), true);
    assert.match(PROFILE_MERCHANT_CTA, /Espace Marchand/);
    assert.match(PROFILE_MERCHANT_HINT, /démonstration/i);
    assert.match(PROFILE_MERCHANT_HINT, /rôle/);
  });

  it("reporte M37–M39 sans les présenter comme opérationnels", () => {
    assert.deepEqual(
      PROFILE_DEFERRED_SECTIONS.map((item) => item.code),
      ["M37", "M38", "M39"],
    );
    assert.match(PROFILE_DEFERRED_NOTE, /M37–M39/);
    assert.match(PROFILE_DEFERRED_NOTE, /Aucun réglage fictif/);
  });

  it("décrit une déconnexion locale vers M02, sans mutation backend", () => {
    assert.equal(PROFILE_LOGOUT.clearsLocalJwt, true);
    assert.equal(PROFILE_LOGOUT.backendMutation, false);
    assert.equal(PROFILE_LOGOUT.returnsTo, "Welcome");
    assert.equal(UNAUTHENTICATED_ROUTES.includes("Welcome"), true);
    assert.equal(UNAUTHENTICATED_ROUTES.includes("Tabs" as never), false);
    assert.equal(AUTHENTICATED_INITIAL_ROUTE, "Tabs");
  });
});
