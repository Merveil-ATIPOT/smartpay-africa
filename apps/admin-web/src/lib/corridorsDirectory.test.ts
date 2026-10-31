import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ADMIN_CORRIDORS_HREF } from "./nav";
import {
  ADMIN_CORRIDORS_PATH,
  CORRIDORS_RELATED_LINKS,
  CORRIDORS_TITLE,
  CORRIDORS_UNAVAILABLE,
  buildCorridorsQuery,
  corridorsContainsSecrets,
  corridorsCopiesStitch,
  corridorsHasLiveTools,
  defaultCorridorFilters,
  formatLocalAmount,
  neverSumDistinctCurrencies,
  statusLabel,
} from "./corridorsDirectory";

describe("corridors administrateur WA.11.1", () => {
  it("oriente vers l'API admin et les routes existantes", () => {
    assert.equal(CORRIDORS_TITLE, "Corridors internationaux");
    assert.equal(ADMIN_CORRIDORS_HREF, "/corridors");
    assert.equal(ADMIN_CORRIDORS_PATH, "/api/v1/admin/corridors/");
    assert.deepEqual(
      CORRIDORS_RELATED_LINKS.map((item) => item.href),
      ["/transactions", "/infrastructure", "/audit"],
    );
    const query = buildCorridorsQuery(
      { ...defaultCorridorFilters(), destinationCountry: "CI", status: "quoted" },
      2,
    );
    assert.match(query, /destination_country=CI/);
    assert.match(query, /status=quoted/);
    assert.match(query, /page=2/);
  });

  it("reste factuel : pas de Stitch, pas de PII, XOF et XAF séparés", () => {
    assert.equal(CORRIDORS_UNAVAILABLE.length, 6);
    assert.equal(corridorsHasLiveTools(), false);
    assert.equal(statusLabel("simulated_credited"), "Crédit Mobile Money simulé");
    assert.match(formatLocalAmount(20000, "XOF"), /20.000 XOF/);
    assert.equal(
      neverSumDistinctCurrencies({
        transfers_total: 2,
        by_status: {},
        amounts: {
          XOF: { amount_local: 20000, amount_sats: 1, transfer_count: 1 },
          XAF: { amount_local: 15000, amount_sats: 1, transfer_count: 1 },
        },
        disclaimer: "",
      }),
      true,
    );
    assert.equal(
      corridorsCopiesStitch({
        title: CORRIDORS_TITLE,
        unavailable: CORRIDORS_UNAVAILABLE,
        amounts: { XOF: 20000, XAF: 15000 },
      }),
      false,
    );
    assert.equal(
      corridorsContainsSecrets({
        results: [{ public_reference: "SPA-1", status: "quoted" }],
      }),
      false,
    );
  });
});
