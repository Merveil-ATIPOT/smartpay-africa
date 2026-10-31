import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  SCAN_FRAME_SIZE,
  SCAN_LINE_HEIGHT,
  SCAN_LINE_INSET,
  scanLineTravelRange,
} from "./scanLine";

describe("scanLineTravelRange", () => {
  it("parcourt le cadre 256 dp du haut intérieur au bas intérieur", () => {
    const { from, to } = scanLineTravelRange(SCAN_FRAME_SIZE);
    assert.equal(from, SCAN_LINE_INSET);
    assert.equal(to, SCAN_FRAME_SIZE - SCAN_LINE_INSET - SCAN_LINE_HEIGHT);
    assert.equal(to - from, 221);
  });

  it("s'adapte à une autre hauteur de cadre", () => {
    const { from, to } = scanLineTravelRange(288, 3, 16);
    assert.equal(from, 16);
    assert.equal(to, 269);
  });

  it("ne dépasse pas le cadre si la hauteur est trop petite", () => {
    const { from, to } = scanLineTravelRange(10, 3, 16);
    assert.equal(from, 7);
    assert.equal(to, 7);
  });
});
