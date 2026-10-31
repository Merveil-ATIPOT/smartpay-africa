import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { UserProfile } from "@smartpay/contracts";

import {
  ADMIN_USER_DETAIL_SOURCE,
  USER_AUDIT_REPORT_UNAVAILABLE,
  USER_AUDIT_UNAVAILABLE,
  USER_DETAIL_ACCESS_DENIED,
  USER_DETAIL_BANNER,
  USER_HISTORY_UNAVAILABLE,
  USER_PREFERENCES_UNAVAILABLE,
  adminUserLookupEnabled,
  buildUserExport,
  exportContainsSecrets,
  parseUserRouteId,
  stitchIllustrationIsNotUsed,
  userAuditLookupEnabled,
  userCountryFlag,
  userCountryLabel,
  userDetailHref,
  userDisplayName,
  userExportFilename,
  userInitials,
  userOperationsLookupEnabled,
  userRoleLabel,
} from "./userDetail";

const me: UserProfile = {
  id: 7,
  email: "ops@smartpay.local",
  first_name: "Marie",
  last_name: "Diop",
  phone_number: "+221770000000",
  role: "admin",
  country: "SN",
  is_active: true,
  date_joined: "2026-01-14T10:00:00Z",
};

describe("fiche utilisateur WA.5", () => {
  it("identifie la route numérique et active la consultation admin", () => {
    assert.equal(parseUserRouteId("7"), 7);
    assert.equal(parseUserRouteId("ops@smartpay.local"), null);
    assert.equal(parseUserRouteId("0"), null);
    assert.equal(adminUserLookupEnabled(), true);
    assert.equal(userDetailHref(7), "/users/7");
    assert.equal(USER_DETAIL_ACCESS_DENIED.includes("Accès interdit"), true);
  });

  it("n'invente ni préférences, ni historique, ni journal d'audit", () => {
    assert.equal(USER_PREFERENCES_UNAVAILABLE, "Préférences non renseignées");
    assert.equal(USER_HISTORY_UNAVAILABLE.includes("aucune source utilisateur autorisée"), true);
    assert.equal(USER_AUDIT_UNAVAILABLE.includes("Aucun journal d'audit"), true);
    assert.equal(
      USER_AUDIT_REPORT_UNAVAILABLE,
      "Rapport d'audit indisponible : aucun journal utilisateur n'est encore accessible depuis l'API d'administration.",
    );
    assert.equal(userOperationsLookupEnabled(), false);
    assert.equal(userAuditLookupEnabled(), false);
    assert.equal(stitchIllustrationIsNotUsed(), true);
  });

  it("dérive le libellé depuis Django sans données Stitch", () => {
    assert.equal(userDisplayName(me), "Marie Diop");
    assert.equal(userRoleLabel("admin"), "Administrateur");
    assert.equal(userRoleLabel("individual"), "Particulier");
    assert.equal(userCountryLabel("SN"), "Sénégal");
    assert.equal(userCountryLabel("CI"), "Côte d'Ivoire");
    assert.equal(userCountryFlag("SN"), "🇸🇳");
    assert.match(USER_DETAIL_BANNER, /PostgreSQL/);
    const anonymous = { ...me, first_name: "", last_name: "" };
    assert.equal(userDisplayName(anonymous), "ops@smartpay.local");
  });

  it("génère l'avatar uniquement depuis le prénom et le nom Django", () => {
    assert.equal(userInitials({ first_name: "Amadou", last_name: "Diallo" }), "AD");
    assert.equal(userInitials({ first_name: "Awa", last_name: "Diallo" }), "AD");
    assert.equal(userInitials({ first_name: "Merveil", last_name: "Atipot" }), "MA");
    assert.equal(userInitials({ first_name: "Marie", last_name: "" }), "M");
    assert.equal(userInitials({ first_name: "", last_name: "Diop" }), "D");
    assert.equal(userInitials({ first_name: "", last_name: "" }), null);
    assert.equal(userInitials({ first_name: "  ", last_name: "  " }), null);
    const seedAdmin = { ...me, email: "admin@smartpay.local", first_name: "", last_name: "" };
    assert.equal(userInitials(seedAdmin), null);
    assert.notEqual(userInitials(seedAdmin), "AD");
  });

  it("exporte le JSON de la fiche sans secrets ni illustration Stitch", () => {
    const payload = buildUserExport(me);
    assert.equal(payload.source, ADMIN_USER_DETAIL_SOURCE);
    assert.equal(payload.network, "regtest");
    assert.equal(payload.user.id, 7);
    assert.equal(payload.user.phone_number, "+221770000000");
    assert.equal(exportContainsSecrets(payload), false);
    assert.equal(JSON.stringify(payload).includes("Amadou"), false);
    assert.equal(JSON.stringify(payload).includes("password"), false);
    assert.equal(userExportFilename(7, new Date("2026-10-30T12:00:00Z")), "smartpay-w04-user-7-regtest-2026-10-30.json");
    const withoutPhone = buildUserExport({ ...me, phone_number: "  " });
    assert.equal(withoutPhone.user.phone_number, null);
  });
});
