import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  nextSuppressedOnFocus,
  scannedInvoiceKey,
  shouldClearSuppressForTab,
  shouldIgnoreBarcode,
} from "./scanResume";

describe("reprise scan M13", () => {
  it("ignore le même QR au retour de M15, pas un QR différent", () => {
    const first = "lnbcrt2500n1pvalidregtest";
    assert.equal(
      shouldIgnoreBarcode({ focused: true, scanned: first, suppressed: scannedInvoiceKey(first) }),
      true,
    );
    assert.equal(
      shouldIgnoreBarcode({
        focused: true,
        scanned: "lnbcrt1potherinvoice",
        suppressed: scannedInvoiceKey(first),
      }),
      false,
    );
  });

  it("n'ouvre rien si l'onglet Scanner n'est pas visible", () => {
    assert.equal(
      shouldIgnoreBarcode({
        focused: false,
        scanned: "lnbcrt1pvalidregtest",
        suppressed: null,
      }),
      true,
    );
  });

  it("autorise un nouveau scan après un départ volontaire du Scanner", () => {
    assert.equal(nextSuppressedOnFocus(true, "lnbcrt1psame"), "lnbcrt1psame");
    assert.equal(nextSuppressedOnFocus(false, "lnbcrt1psame"), null);
    assert.equal(shouldClearSuppressForTab("Home"), true);
    assert.equal(shouldClearSuppressForTab("Scanner"), false);
  });
});
