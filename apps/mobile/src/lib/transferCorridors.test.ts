import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CORRIDORS, corridorsFromCatalog, demoRecipientsFor, filterCorridors, getCorridor } from "./transferCorridors";

describe("M22 corridors", () => {
  it("filtre par recherche pays ou opérateur", () => {
    const wave = filterCorridors("wave", "all");
    assert.ok(wave.some((item) => item.code === "SN"));
    assert.ok(wave.some((item) => item.code === "CI"));
    assert.equal(filterCorridors("t-money", "all")[0]?.code, "TG");
  });

  it("filtre UEMOA et CEMAC", () => {
    assert.ok(filterCorridors("", "uemoa").every((item) => item.region === "uemoa"));
    assert.ok(filterCorridors("", "cemac").every((item) => item.region === "cemac"));
  });

  it("marque la France comme indisponible", () => {
    const france = getCorridor("FR");
    assert.equal(france?.available, false);
    assert.equal(filterCorridors("europe", "intl")[0]?.code, "FR");
  });

  it("présente les corridors recommandés et les autres destinations", () => {
    const recommended = CORRIDORS.filter((item) => item.recommended).map((item) => item.code);
    const others = CORRIDORS.filter((item) => !item.recommended).map((item) => item.code);
    assert.deepEqual(recommended, ["SN", "CI", "CG"]);
    assert.deepEqual(others, ["CM", "BJ", "TG", "FR"]);
  });

  it("propose uniquement des bénéficiaires de démonstration du pays", () => {
    assert.ok(demoRecipientsFor("CI").every((item) => item.country === "CI"));
    assert.equal(demoRecipientsFor("FR").length, 0);
  });

  it("enrichit le catalogue Django sans inventer de corridor", () => {
    const merged = corridorsFromCatalog([
      {
        code: "CI",
        name: "Côte d'Ivoire",
        currency: "XOF",
        region: "uemoa",
        recommended: true,
        available: true,
        dial_code: "+225",
        operators: [{ id: "wave", label: "Wave", short_label: "Wave" }],
      },
    ]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.code, "CI");
    assert.equal(merged[0]?.flag, "🇨🇮");
    assert.equal(merged[0]?.operators[0]?.id, "wave");
  });
});
