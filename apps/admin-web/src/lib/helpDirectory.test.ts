import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ADMIN_HELP_HREF } from "./nav";
import {
  HELP_DEMO_NOTE,
  HELP_FAQ,
  HELP_GUIDES,
  HELP_TITLE,
  HELP_UNAVAILABLE_SUPPORT,
  helpContainsSecrets,
  helpCopiesMobileSupport,
  helpGuideHrefs,
  helpHasTicketForm,
} from "./helpDirectory";

describe("assistance administrateur WA.10.2", () => {
  it("oriente uniquement vers des routes admin existantes", () => {
    assert.equal(HELP_TITLE, "Assistance");
    assert.equal(ADMIN_HELP_HREF, "/help");
    assert.match(HELP_DEMO_NOTE, /démonstration/i);
    assert.deepEqual(helpGuideHrefs(), ["/infrastructure", "/audit", "/transactions", "/users", "/merchants"]);
    assert.equal(HELP_GUIDES.length, 4);
    assert.equal(
      HELP_GUIDES.some((guide) => guide.body.toLowerCase().includes("connexion")),
      true,
    );
  });

  it("reste factuel : pas de ticket, pas de M39, pas de secret", () => {
    assert.equal(HELP_FAQ.length, 6);
    assert.equal(HELP_UNAVAILABLE_SUPPORT.length, 4);
    assert.equal(helpHasTicketForm(), false);
    assert.equal(helpCopiesMobileSupport(), false);
    assert.equal(helpContainsSecrets({ guides: HELP_GUIDES, faq: HELP_FAQ }), false);
    assert.equal(
      HELP_FAQ.some((item) => /certification de sécurité|partenaire financier est branché/i.test(item.answer)),
      false,
    );
    assert.match(HELP_FAQ.find((item) => item.id === "regtest")?.answer ?? "", /Mainnet n'est pas branché/);
    assert.match(HELP_GUIDES.find((item) => item.id === "audit")?.body ?? "", /payment\.\*/);
    assert.match(HELP_FAQ.find((item) => item.id === "audit-content")?.answer ?? "", /paiements/);
  });
});
