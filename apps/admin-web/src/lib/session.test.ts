import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SESSION_ACCESS_KEY, SESSION_REFRESH_KEY, createSessionStore } from "./session";

describe("session JWT du portail", () => {
  it("écrit et efface les jetons dans un stockage de session, pas dans le code", () => {
    const session = createSessionStore();
    session.write({ access: "access-token", refresh: "refresh-token" });
    assert.equal(session.read().access, "access-token");
    session.clear();
    assert.equal(session.read().access, undefined);
    assert.equal(session.read().refresh, undefined);
    assert.equal(SESSION_ACCESS_KEY.includes("access"), true);
    assert.equal(SESSION_REFRESH_KEY.includes("refresh"), true);
  });
});
