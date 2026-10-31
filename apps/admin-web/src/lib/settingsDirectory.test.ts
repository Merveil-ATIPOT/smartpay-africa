import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { UserProfile } from "@smartpay/contracts";

import { ADMIN_SETTINGS_HREF } from "./nav";
import {
  SETTINGS_ACCESS_DENIED,
  SETTINGS_SOURCE_NOTE,
  SETTINGS_TITLE,
  SETTINGS_UNAVAILABLE_PREFERENCES,
  SETTINGS_UNAVAILABLE_SECURITY,
  SETTINGS_VALUE_ABSENT,
  djangoAvailabilityLabel,
  neverFetchPaymentDetail,
  postgresAvailabilityLabel,
  settingsContainsSecrets,
  settingsHasSaveAction,
  settingsIdentity,
  settingsIdentityHasSecrets,
  settingsNodeLabel,
} from "./settingsDirectory";
import { EMPTY_NODE } from "./infrastructure";

const admin: UserProfile = {
  id: 1,
  email: "admin@smartpay.local",
  first_name: "Awa",
  last_name: "Diallo",
  phone_number: "+221770000001",
  role: "admin",
  country: "SN",
  is_active: true,
  date_joined: "2026-10-29T10:00:00Z",
};

describe("paramètres administrateur WA.10.1", () => {
  it("expose uniquement les champs /me/ réellement renseignés", () => {
    const named = settingsIdentity(admin);
    assert.equal(named.displayName, "Awa Diallo");
    assert.equal(named.email, "admin@smartpay.local");
    assert.equal(named.roleLabel, "Administrateur");
    assert.equal(named.countryLabel, "Sénégal");
    assert.equal(named.phone, "+221770000001");
    assert.equal(settingsIdentityHasSecrets(named), false);
    const anonymous = settingsIdentity({ ...admin, first_name: "", last_name: "", phone_number: "  " });
    assert.equal(anonymous.displayName, null);
    assert.equal(anonymous.phone, null);
    assert.equal(SETTINGS_VALUE_ABSENT, "Non renseigné");
    assert.equal("last_login" in named, false);
    assert.equal(SETTINGS_TITLE, "Paramètres");
    assert.equal(ADMIN_SETTINGS_HREF, "/settings");
    assert.match(SETTINGS_SOURCE_NOTE, /\/me\//);
    assert.equal(SETTINGS_ACCESS_DENIED.includes("Accès interdit"), true);
  });

  it("distingue connecté et synchronisé sans inventer de préférence", () => {
    assert.equal(djangoAvailabilityLabel("ok"), "Disponible");
    assert.equal(postgresAvailabilityLabel("down"), "Indisponible");
    assert.equal(settingsNodeLabel({ ...EMPTY_NODE, connected: true, status: "connected", synced_to_chain: false }), "Connecté · non synchronisé");
    assert.equal(settingsNodeLabel({ ...EMPTY_NODE, connected: true, status: "connected", synced_to_chain: true }), "Connecté");
    assert.equal(SETTINGS_UNAVAILABLE_SECURITY.length, 3);
    assert.equal(SETTINGS_UNAVAILABLE_PREFERENCES.length, 3);
    assert.equal(settingsHasSaveAction(), false);
    assert.equal(neverFetchPaymentDetail(), true);
    assert.equal(settingsContainsSecrets({ note: SETTINGS_SOURCE_NOTE }), false);
  });
});
