import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ADMIN_AUDIT_HREF,
  ADMIN_CORRIDORS_HREF,
  ADMIN_HELP_HREF,
  ADMIN_HOME_HREF,
  ADMIN_INFRASTRUCTURE_HREF,
  ADMIN_LOGIN_HREF,
  ADMIN_NAV_GROUPS,
  ADMIN_SETTINGS_HREF,
  ADMIN_TRANSACTIONS_HREF,
  ADMIN_USERS_HREF,
  flattenNavItems,
  hasOperationalNavItem,
  isNavItemActive,
  merchantDetailHref,
  userDetailHref,
} from "./nav";

describe("navigation WA.11", () => {
  it("active Corridors internationaux et conserve les écrans validés", () => {
    const items = flattenNavItems();
    assert.deepEqual(
      items.map((item) => item.id),
      ["w02", "w07", "w08", "w03", "w05", "w09", "audit", "settings", "help"],
    );
    const overview = items.find((item) => item.id === "w02");
    const transactions = items.find((item) => item.id === "w07");
    const corridors = items.find((item) => item.id === "w08");
    const users = items.find((item) => item.id === "w03");
    const merchants = items.find((item) => item.id === "w05");
    const infrastructure = items.find((item) => item.id === "w09");
    const audit = items.find((item) => item.id === "audit");
    const settings = items.find((item) => item.id === "settings");
    const help = items.find((item) => item.id === "help");
    assert.equal(overview?.available, true);
    assert.equal(overview?.href, "/");
    assert.equal(transactions?.available, true);
    assert.equal(transactions?.href, ADMIN_TRANSACTIONS_HREF);
    assert.equal(corridors?.available, true);
    assert.equal(corridors?.href, ADMIN_CORRIDORS_HREF);
    assert.equal(corridors?.label, "Corridors internationaux");
    assert.equal(users?.available, true);
    assert.equal(users?.href, ADMIN_USERS_HREF);
    assert.equal(merchants?.available, true);
    assert.equal(merchants?.href, "/merchants");
    assert.equal(infrastructure?.available, true);
    assert.equal(infrastructure?.href, ADMIN_INFRASTRUCTURE_HREF);
    assert.equal(infrastructure?.label, "Nœud & Infrastructure LND");
    assert.equal(audit?.available, true);
    assert.equal(audit?.href, ADMIN_AUDIT_HREF);
    assert.equal(audit?.label, "Audit & Sécurité");
    assert.equal(settings?.available, true);
    assert.equal(settings?.href, ADMIN_SETTINGS_HREF);
    assert.equal(settings?.label, "Paramètres");
    assert.equal(help?.available, true);
    assert.equal(help?.href, ADMIN_HELP_HREF);
    assert.equal(help?.label, "Assistance");
    assert.equal(items.every((item) => item.available === true), true);
    assert.equal(hasOperationalNavItem(), true);
    assert.equal(isNavItemActive(overview!, "/"), true);
    assert.equal(isNavItemActive(overview!, "/users"), false);
    assert.equal(isNavItemActive(transactions!, "/transactions"), true);
    assert.equal(isNavItemActive(corridors!, "/corridors"), true);
    assert.equal(isNavItemActive(corridors!, "/transactions"), false);
    assert.equal(isNavItemActive(users!, "/users"), true);
    assert.equal(isNavItemActive(users!, "/users/7"), true);
    assert.equal(isNavItemActive(users!, "/transactions"), false);
    assert.equal(isNavItemActive(merchants!, "/merchants"), true);
    assert.equal(isNavItemActive(merchants!, "/merchants/1"), true);
    assert.equal(isNavItemActive(merchants!, "/users"), false);
    assert.equal(isNavItemActive(infrastructure!, "/infrastructure"), true);
    assert.equal(isNavItemActive(infrastructure!, "/transactions"), false);
    assert.equal(isNavItemActive(transactions!, "/infrastructure"), false);
    assert.equal(isNavItemActive(audit!, "/audit"), true);
    assert.equal(isNavItemActive(audit!, "/infrastructure"), false);
    assert.equal(isNavItemActive(settings!, "/settings"), true);
    assert.equal(isNavItemActive(settings!, "/audit"), false);
    assert.equal(isNavItemActive(help!, "/help"), true);
    assert.equal(isNavItemActive(help!, "/settings"), false);
    assert.equal(userDetailHref(7), "/users/7");
    assert.equal(merchantDetailHref(1), "/merchants/1");
    assert.equal(ADMIN_HOME_HREF, "/");
    assert.equal(ADMIN_LOGIN_HREF, "/login");
    assert.equal(ADMIN_CORRIDORS_HREF, "/corridors");
    assert.equal(ADMIN_NAV_GROUPS[2]?.title, "Infrastructure & Audit");
    assert.equal(ADMIN_NAV_GROUPS.length, 4);
  });
});
