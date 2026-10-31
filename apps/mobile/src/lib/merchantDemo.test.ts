import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEMO_SALES,
  MERCHANT_DEMO_ENTRY_LABEL,
  MERCHANT_DEMO_SHOP_BANNER,
  MERCHANT_TAB_SCREENS,
  applyKeypadBackspace,
  applyKeypadDigit,
  buildDemoQrPayload,
  computeMerchantStats,
  createDemoReference,
  dailyActivityBars,
  filterSales,
  isFictivelySettled,
  looksLikeBolt11,
  merchantSatsFromFcfa,
  resetShopSettings,
  saleStatusLabel,
  salesInRange,
  setShopSettings,
  type MerchantSale,
} from "./merchantDemo";

describe("Espace Marchand démo", () => {
  it("identifie la démo sans lier le compte utilisateur", () => {
    assert.equal(MERCHANT_DEMO_ENTRY_LABEL, "Démo Espace Marchand");
    assert.match(MERCHANT_DEMO_SHOP_BANNER, /Teranga/);
    assert.match(MERCHANT_DEMO_SHOP_BANNER, /non liée à votre compte/i);
  });

  it("convertit 25 000 FCFA avec le taux de démo", () => {
    assert.equal(merchantSatsFromFcfa(25_000), 57_737);
  });

  it("saisit le clavier sans dépasser 9 chiffres", () => {
    let amount = applyKeypadDigit(0, "2");
    amount = applyKeypadDigit(amount, "5");
    amount = applyKeypadDigit(amount, "000".slice(0, 3) === "000" ? "00" : "0");
    amount = applyKeypadDigit(amount, "0");
    assert.equal(applyKeypadDigit(0, "2"), 2);
    assert.equal(applyKeypadDigit(2, "5"), 25);
    assert.equal(applyKeypadDigit(25, "00"), 2500);
    assert.equal(applyKeypadDigit(2500, "0"), 25000);
    assert.equal(applyKeypadBackspace(25000), 2500);
    const long = applyKeypadDigit(123456789, "0");
    assert.equal(long, 123456789);
  });

  it("produit un QR non BOLT11", () => {
    const reference = createDemoReference(0xabcdefff);
    const payload = buildDemoQrPayload(reference, 25_000);
    assert.match(payload, /^smartpay-demo:/);
    assert.equal(looksLikeBolt11(payload), false);
    assert.equal(looksLikeBolt11("lnbcrt250u1demo"), true);
    assert.equal(looksLikeBolt11("lnbc1mainnet"), true);
  });

  it("filtre l'historique fictif", () => {
    assert.equal(filterSales(DEMO_SALES, "", "all").length, DEMO_SALES.length);
    assert.ok(filterSales(DEMO_SALES, "8924", "all").every((sale) => sale.id === "SN-8924"));
    assert.ok(filterSales(DEMO_SALES, "", "pending").every((sale) => sale.status === "pending"));
    assert.ok(filterSales(DEMO_SALES, "", "refunds").every((sale) => sale.status === "void"));
    assert.equal(saleStatusLabel("specimen").includes("réglé"), true);
  });

  it("identifie le spécimen sans le présenter comme un règlement", () => {
    const specimen = DEMO_SALES.find((sale) => sale.specimen);
    assert.ok(specimen);
    assert.equal(specimen.status, "specimen");
    assert.match(saleStatusLabel(specimen.status), /non réglé/i);
  });

  it("mappe les quatre rubriques stables, hors facture et QR", () => {
    assert.equal(MERCHANT_TAB_SCREENS.home, "MerchantHome");
    assert.equal(MERCHANT_TAB_SCREENS.sales, "MerchantSalesAnalytics");
    assert.equal(MERCHANT_TAB_SCREENS.history, "MerchantSalesHistory");
    assert.equal(MERCHANT_TAB_SCREENS.shop, "MerchantShop");
    assert.equal("invoice" in MERCHANT_TAB_SCREENS, false);
  });

  it("sépare les montants réglés des non réglés", () => {
    const stats = computeMerchantStats(DEMO_SALES);
    assert.equal(stats.settledFcfa, 0);
    assert.equal(stats.settledCount, 0);
    assert.equal(DEMO_SALES.every((sale) => !isFictivelySettled(sale)), true);
    assert.equal(stats.pendingFcfa, 6_000);
    assert.equal(stats.voidCount, 1);
    assert.equal(stats.totalOpsFcfa, 25_000 + 4_500 + 28_000 + 6_000 + 2_000);
    assert.ok(stats.settledFcfa < stats.totalOpsFcfa);
    assert.equal(saleStatusLabel("demo"), "Non réglé (démo)");
    assert.equal(saleStatusLabel("pending"), "En attente");
    assert.equal(saleStatusLabel("void"), "Annulé");
    assert.equal(saleStatusLabel("settled"), "Réglé fictivement");
  });

  it("filtre les statistiques à partir des transactions locales", () => {
    const extra: MerchantSale[] = [
      ...DEMO_SALES,
      {
        id: "SN-8700",
        label: "Ancienne",
        amountFcfa: 1_000,
        status: "demo",
        timeLabel: "J-10",
        daysAgo: 10,
        note: "hors 7 jours",
        specimen: false,
      },
      {
        id: "SN-8500",
        label: "Très ancienne",
        amountFcfa: 3_000,
        status: "pending",
        timeLabel: "J-40",
        daysAgo: 40,
        note: "hors 30 jours",
        specimen: false,
      },
    ];
    assert.equal(salesInRange(extra, "today").every((sale) => sale.daysAgo === 0), true);
    assert.equal(salesInRange(extra, "7d").some((sale) => sale.id === "SN-8700"), false);
    assert.equal(salesInRange(extra, "30d").some((sale) => sale.id === "SN-8700"), true);
    assert.equal(salesInRange(extra, "30d").some((sale) => sale.id === "SN-8500"), false);
    assert.equal(salesInRange(extra, "all").length, extra.length);
    const today = computeMerchantStats(salesInRange(DEMO_SALES, "today"));
    assert.equal(today.totalOpsFcfa, 25_000 + 4_500 + 28_000);
    assert.equal(today.settledFcfa, 0);
    const bars = dailyActivityBars(DEMO_SALES);
    assert.equal(bars.length, 7);
    assert.equal(bars[bars.length - 1]?.amountFcfa, 25_000 + 4_500 + 28_000);
  });

  it("conserve la recherche et les filtres d'historique", () => {
    assert.equal(filterSales(DEMO_SALES, "", "today").every((sale) => sale.daysAgo === 0), true);
    assert.ok(filterSales(DEMO_SALES, "Boissons", "all").every((sale) => sale.id === "SN-8923"));
    assert.equal(filterSales(DEMO_SALES, "inconnu", "all").length, 0);
  });

  it("garde les réglages boutique en mémoire locale", () => {
    resetShopSettings();
    const next = setShopSettings({ tipEnabled: true, defaultExpiryMinutes: 60 });
    assert.equal(next.tipEnabled, true);
    assert.equal(next.defaultExpiryMinutes, 60);
    resetShopSettings();
    assert.equal(resetShopSettings().tipEnabled, false);
  });
});
