import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ADMIN_AUDIT_HREF } from "./nav";
import {
  ADMIN_AUDIT_PATH,
  AUDIT_ACCESS_DENIED,
  AUDIT_EMPTY,
  AUDIT_EXPORT_HINT,
  AUDIT_REGTEST_BADGE,
  AUDIT_TITLE,
  actorLabel,
  auditExportContainsSecrets,
  auditExportFilename,
  buildAuditExport,
  buildAuditQuery,
  categoryLabel,
  defaultAuditFilters,
  filtersAreDefault,
  neverFetchPaymentDetail,
  visiblePageNumbers,
  type AuditEvent,
} from "./auditDirectory";

const event: AuditEvent = {
  id: 12,
  created_at: "2026-10-30T20:00:00Z",
  action: "transfer.validation_failed",
  resource_type: "transfer",
  resource_id: "7",
  actor: { id: 2, email: "user@smartpay.local" },
  category: "transfer",
  severity: { key: "warning", label: "Avertissement — classification applicative" },
  metadata_safe: { reason: "montant trop élevé", status: "FAILED" },
};

describe("journal d'audit WA.9.1", () => {
  it("construit la requête paginée sans charger toute la base", () => {
    assert.equal(buildAuditQuery(defaultAuditFilters(), 1), `${ADMIN_AUDIT_PATH}?page=1&page_size=20`);
    assert.equal(
      buildAuditQuery(
        {
          query: "quoted",
          action: "transfer.quoted",
          resourceType: "transfer",
          resourceId: "7",
          actor: "2",
          createdAfter: "",
          createdBefore: "",
        },
        2,
      ),
      `${ADMIN_AUDIT_PATH}?page=2&page_size=20&q=quoted&action=transfer.quoted&resource_type=transfer&resource_id=7&actor=2`,
    );
    assert.equal(filtersAreDefault(defaultAuditFilters()), true);
    assert.equal(filtersAreDefault({ ...defaultAuditFilters(), action: "payment.created" }), false);
    assert.equal(ADMIN_AUDIT_HREF, "/audit");
    assert.equal(AUDIT_TITLE, "Audit & Sécurité");
    assert.match(AUDIT_REGTEST_BADGE, /Journal applicatif/);
    assert.equal(AUDIT_ACCESS_DENIED.includes("Accès interdit"), true);
    assert.equal(AUDIT_EMPTY.includes("Aucun événement"), true);
  });

  it("exporte uniquement la page courante sans secrets ni conformité", () => {
    const payload = buildAuditExport([event], 1);
    assert.equal(payload.page, 1);
    assert.equal(payload.events.length, 1);
    assert.equal(payload.events[0]?.action, "transfer.validation_failed");
    assert.equal("metadata" in payload.events[0]!, false);
    assert.equal(auditExportContainsSecrets(payload), false);
    assert.match(AUDIT_EXPORT_HINT, /page courante/i);
    assert.equal(AUDIT_EXPORT_HINT.toLowerCase().includes("conformité"), true);
    assert.match(auditExportFilename(1, new Date("2026-10-30T12:00:00Z")), /smartpay-audit-page-1-regtest-2026-10-30\.json/);
    assert.equal(neverFetchPaymentDetail(), true);
    assert.equal(categoryLabel("payment"), "Paiement");
    assert.equal(actorLabel(null), "Système");
    assert.deepEqual(visiblePageNumbers(1, 1), [1]);
  });
});
