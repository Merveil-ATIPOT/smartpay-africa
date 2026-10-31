import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MERCHANT_FAB_CLEARANCE,
  MERCHANT_FLOW_ROUTES,
  MERCHANT_ROOT_ROUTE,
  MERCHANT_SPEED_DIAL_ITEMS,
  MERCHANT_TAB_ROUTES,
  MERCHANT_TABS_ROUTE,
  SMARTPAY_HOME_TAB,
  SMARTPAY_TABS_ROUTE,
  goMerchantAreaHome,
  goMerchantCaisse,
  goMerchantSales,
  goSmartPayHome,
  isMerchantCaisseLocation,
  merchantDemoIsAccountBound,
  merchantDemoRequiresDjangoShop,
  merchantTabsDoNotStack,
  openMerchantDemo,
  readMerchantLocation,
  runMerchantSpeedDialAction,
  speedDialVisibleOn,
} from "./merchantNavigation";

type Call = { name: string; params?: unknown };

function fakeNav() {
  const calls: Call[] = [];
  return {
    calls,
    navigate(name: string, params?: unknown) {
      calls.push({ name, params });
    },
  };
}

describe("navigation marchande N1–N3", () => {
  it("expose une racine unique et quatre rubriques stables", () => {
    assert.equal(MERCHANT_ROOT_ROUTE, "Merchant");
    assert.equal(MERCHANT_TABS_ROUTE, "MerchantTabs");
    assert.deepEqual(MERCHANT_TAB_ROUTES, {
      caisse: "MerchantHome",
      sales: "MerchantSalesAnalytics",
      history: "MerchantSalesHistory",
      shop: "MerchantShop",
    });
    assert.equal(merchantTabsDoNotStack(), true);
  });

  it("garde facture, QR et reçu hors des onglets", () => {
    assert.equal(MERCHANT_FLOW_ROUTES.invoice, "MerchantCreateInvoice");
    assert.equal(MERCHANT_FLOW_ROUTES.qr, "MerchantQr");
    assert.equal(MERCHANT_FLOW_ROUTES.receipt, "MerchantReceipt");
    const tabNames: string[] = Object.values(MERCHANT_TAB_ROUTES);
    assert.equal(tabNames.includes("MerchantCreateInvoice"), false);
    assert.equal(tabNames.includes("MerchantQr"), false);
  });

  it("revient à SmartPay sans empiler un second Accueil", () => {
    const nav = fakeNav();
    goSmartPayHome(nav as never);
    assert.deepEqual(nav.calls, [{ name: SMARTPAY_TABS_ROUTE, params: { screen: SMARTPAY_HOME_TAB } }]);
  });

  it("cible la caisse et les ventes via le navigateur imbriqué", () => {
    const nav = fakeNav();
    goMerchantCaisse(nav as never);
    goMerchantSales(nav as never);
    goMerchantAreaHome(nav as never);
    assert.deepEqual(nav.calls[0], {
      name: MERCHANT_ROOT_ROUTE,
      params: { screen: MERCHANT_TABS_ROUTE, params: { screen: "MerchantHome" } },
    });
    assert.deepEqual(nav.calls[1], {
      name: MERCHANT_ROOT_ROUTE,
      params: { screen: MERCHANT_TABS_ROUTE, params: { screen: "MerchantSalesAnalytics" } },
    });
    assert.deepEqual(nav.calls[2], {
      name: MERCHANT_ROOT_ROUTE,
      params: { screen: MERCHANT_TABS_ROUTE },
    });
  });

  it("ouvre la démo depuis Services sans lier le compte", () => {
    const nav = fakeNav();
    openMerchantDemo(nav as never);
    assert.equal(nav.calls[0]?.name, MERCHANT_ROOT_ROUTE);
    assert.equal(merchantDemoIsAccountBound(), false);
    assert.equal(merchantDemoRequiresDjangoShop(), false);
  });

  it("propose exactement trois raccourcis du bouton flottant", () => {
    assert.deepEqual(
      MERCHANT_SPEED_DIAL_ITEMS.map((item) => item.label),
      ["Accueil SmartPay", "Ma caisse", "Mes ventes"],
    );
    assert.deepEqual(
      MERCHANT_SPEED_DIAL_ITEMS.map((item) => item.icon),
      ["home-outline", "storefront-outline", "stats-chart-outline"],
    );
    assert.ok(MERCHANT_FAB_CLEARANCE >= 72);
    const nav = fakeNav();
    runMerchantSpeedDialAction(nav as never, "smartpay");
    runMerchantSpeedDialAction(nav as never, "sales");
    assert.equal(nav.calls[0]?.name, SMARTPAY_TABS_ROUTE);
    assert.equal(nav.calls[1]?.name, MERCHANT_ROOT_ROUTE);
  });

  it("ne réempile pas Ma caisse si l'utilisateur y est déjà", () => {
    const nav = fakeNav();
    runMerchantSpeedDialAction(nav as never, "caisse", {
      stack: MERCHANT_TABS_ROUTE,
      tab: MERCHANT_TAB_ROUTES.caisse,
    });
    assert.equal(nav.calls.length, 0);
    runMerchantSpeedDialAction(nav as never, "caisse", {
      stack: MERCHANT_TABS_ROUTE,
      tab: MERCHANT_TAB_ROUTES.sales,
    });
    assert.equal(nav.calls.length, 1);
    assert.equal(isMerchantCaisseLocation({ stack: "MerchantQr", tab: MERCHANT_TAB_ROUTES.caisse }), false);
  });

  it("masque le bouton flottant hors des onglets marchands", () => {
    assert.equal(speedDialVisibleOn({ stack: MERCHANT_TABS_ROUTE, tab: MERCHANT_TAB_ROUTES.caisse }), true);
    assert.equal(speedDialVisibleOn({ stack: MERCHANT_FLOW_ROUTES.invoice }), false);
    assert.equal(speedDialVisibleOn({ stack: MERCHANT_FLOW_ROUTES.qr }), false);
    assert.equal(speedDialVisibleOn({ stack: MERCHANT_FLOW_ROUTES.receipt }), false);
    assert.equal(speedDialVisibleOn(undefined), false);
  });

  it("lit la position marchande depuis l'état racine, le stack ou les tabs", () => {
    const fromRoot = readMerchantLocation({
      index: 1,
      routes: [
        { name: SMARTPAY_TABS_ROUTE },
        {
          name: MERCHANT_ROOT_ROUTE,
          state: {
            index: 1,
            routes: [
              {
                name: MERCHANT_TABS_ROUTE,
                state: {
                  index: 1,
                  routes: [
                    { name: MERCHANT_TAB_ROUTES.caisse },
                    { name: MERCHANT_TAB_ROUTES.sales },
                  ],
                },
              },
              { name: MERCHANT_FLOW_ROUTES.qr },
            ],
          },
        },
      ],
    });
    assert.deepEqual(fromRoot, { stack: MERCHANT_FLOW_ROUTES.qr, tab: MERCHANT_TAB_ROUTES.sales });

    const fromTabs = readMerchantLocation({
      index: 0,
      routes: [
        {
          name: MERCHANT_TABS_ROUTE,
          state: {
            index: 2,
            routes: [
              { name: MERCHANT_TAB_ROUTES.caisse },
              { name: MERCHANT_TAB_ROUTES.sales },
              { name: MERCHANT_TAB_ROUTES.history },
            ],
          },
        },
      ],
    });
    assert.deepEqual(fromTabs, { stack: MERCHANT_TABS_ROUTE, tab: MERCHANT_TAB_ROUTES.history });

    const fromTabNavigator = readMerchantLocation({
      index: 0,
      routes: [{ name: MERCHANT_TAB_ROUTES.caisse }],
    });
    assert.deepEqual(fromTabNavigator, { stack: MERCHANT_TABS_ROUTE, tab: MERCHANT_TAB_ROUTES.caisse });
  });
});
