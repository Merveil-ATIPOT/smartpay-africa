import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  LND_DEMO_NODE_BALANCE_LABEL,
  MOCK_BALANCE_LABEL,
  OFFICIAL_LOGO_ASSET,
  countryLine,
  parseSatsInput,
  walletBalanceLabel,
} from "./format";
import { CORRIDORS, getCorridor } from "./transferCorridors";

describe("localisation et corridors P0", () => {
  it("interprète SN comme Dakar, Sénégal", () => {
    assert.equal(countryLine("SN"), "Dakar, Sénégal");
  });

  it("conserve les libellés CI et CG sans les masquer", () => {
    assert.equal(countryLine("CI"), "Abidjan, Côte d'Ivoire");
    assert.equal(countryLine("CG"), "Brazzaville, Congo");
  });

  it("laisse CI et CG disponibles comme destinations", () => {
    assert.equal(getCorridor("CI")?.available, true);
    assert.equal(getCorridor("CG")?.available, true);
    assert.ok(CORRIDORS.some((item) => item.code === "CI" && item.available));
    assert.ok(CORRIDORS.some((item) => item.code === "CG" && item.available));
  });
});

describe("accueil Particulier", () => {
  it("ne présente pas le canal Alice comme un solde personnel", () => {
    assert.equal(walletBalanceLabel("lnd_regtest"), LND_DEMO_NODE_BALANCE_LABEL);
    assert.match(LND_DEMO_NODE_BALANCE_LABEL, /laboratoire/i);
    assert.match(LND_DEMO_NODE_BALANCE_LABEL, /pas un portefeuille personnel/i);
    assert.equal(walletBalanceLabel("mock"), MOCK_BALANCE_LABEL);
  });

  it("pointe vers le logo officiel local", () => {
    assert.equal(OFFICIAL_LOGO_ASSET, "Logo_SmartPay_Africa.png");
  });
});

describe("montant libre M20", () => {
  it("accepte 2500 sats avec ou sans espace insécable", () => {
    assert.equal(parseSatsInput("2500"), 2500);
    assert.equal(parseSatsInput("2 500"), 2500);
    assert.equal(parseSatsInput("2\u202f500"), 2500);
    assert.equal(parseSatsInput(""), null);
    assert.equal(parseSatsInput("12.5"), null);
  });
});
