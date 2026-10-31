import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { UserProfile } from "@smartpay/contracts";

import {
  ADMIN_FORBIDDEN_MESSAGE,
  ADMIN_GATE_LIMITATION,
  PORTAL_ADMIN_ROLE,
  isPortalAdmin,
  portalDisplayName,
  portalRoleLabel,
} from "./adminGate";

const admin: UserProfile = {
  id: 1,
  email: "ops@example.local",
  first_name: "Marie",
  last_name: "Diop",
  phone_number: "",
  role: "admin",
  country: "SN",
  is_active: true,
  date_joined: "2026-01-01T00:00:00Z",
};

describe("autorisation portail WA.1", () => {
  it("n'accepte qu'un compte actif avec role=admin renvoyé par /me/", () => {
    assert.equal(PORTAL_ADMIN_ROLE, "admin");
    assert.equal(isPortalAdmin(admin), true);
    assert.equal(isPortalAdmin({ ...admin, role: "individual" }), false);
    assert.equal(isPortalAdmin({ ...admin, role: "merchant" }), false);
    assert.equal(isPortalAdmin({ ...admin, is_active: false }), false);
    assert.equal(isPortalAdmin(null), false);
  });

  it("ne s'appuie pas sur is_staff ou is_superuser côté client", () => {
    assert.equal("is_staff" in admin, false);
    assert.equal("is_superuser" in admin, false);
    assert.match(ADMIN_GATE_LIMITATION, /is_staff/);
    assert.match(ADMIN_FORBIDDEN_MESSAGE, /autorisé/);
  });

  it("affiche l'identité issue du backend", () => {
    assert.equal(portalDisplayName(admin), "Marie Diop");
    assert.equal(portalDisplayName({ ...admin, first_name: "", last_name: "" }), "ops@example.local");
    assert.equal(portalRoleLabel("admin"), "Administrateur");
    assert.equal(portalRoleLabel("individual"), "Non administrateur");
  });
});
