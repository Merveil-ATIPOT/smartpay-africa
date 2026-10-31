type Nav = {
  navigate: (name: string, params?: object) => void;
};

/**
 * Navigation marchande N1–N3.
 *
 * L'espace est un navigateur imbriqué : quatre rubriques stables (tabs) et un
 * parcours secondaire (facture → QR → reçu). Aucune activation Django, aucun
 * contrôle de propriétaire, aucune API marchande. Ouvert à tout JWT connecté.
 *
 * N4+ pourra brancher ici : activation du mode Marchand, droits /me/, boutique
 * du propriétaire, isolation des ventes. Ne pas le faire dans cette phase.
 */

export const MERCHANT_ROOT_ROUTE = "Merchant" as const;
export const MERCHANT_TABS_ROUTE = "MerchantTabs" as const;
export const SMARTPAY_TABS_ROUTE = "Tabs" as const;
export const SMARTPAY_HOME_TAB = "Home" as const;

export const MERCHANT_TAB_ROUTES = {
  caisse: "MerchantHome",
  sales: "MerchantSalesAnalytics",
  history: "MerchantSalesHistory",
  shop: "MerchantShop",
} as const;

export const MERCHANT_FLOW_ROUTES = {
  invoice: "MerchantCreateInvoice",
  qr: "MerchantQr",
  receipt: "MerchantReceipt",
} as const;

export const MERCHANT_FAB_CLEARANCE = 88;

export type MerchantLocation = {
  stack: string;
  tab?: string;
};

export type NavStateLike = {
  index?: number;
  routes: Array<{ name: string; state?: NavStateLike }>;
};

const MERCHANT_TAB_NAMES: readonly string[] = Object.values(MERCHANT_TAB_ROUTES);
const MERCHANT_FLOW_NAMES: readonly string[] = Object.values(MERCHANT_FLOW_ROUTES);

function tabFrom(state: NavStateLike | undefined): string {
  if (!state || state.index == null) {
    return MERCHANT_TAB_ROUTES.caisse;
  }
  return state.routes[state.index]?.name ?? MERCHANT_TAB_ROUTES.caisse;
}

/** Lit la pile marchande depuis l'état racine, le stack imbriqué ou les tabs. */
export function readMerchantLocation(state: NavStateLike | undefined): MerchantLocation {
  if (!state || state.index == null) {
    return { stack: MERCHANT_TABS_ROUTE, tab: MERCHANT_TAB_ROUTES.caisse };
  }

  const merchant = state.routes.find((route) => route.name === MERCHANT_ROOT_ROUTE);
  if (merchant?.state) {
    return readMerchantLocation(merchant.state);
  }

  const current = state.routes[state.index];
  if (!current) {
    return { stack: MERCHANT_TABS_ROUTE, tab: MERCHANT_TAB_ROUTES.caisse };
  }

  if (current.name === MERCHANT_TABS_ROUTE) {
    return { stack: MERCHANT_TABS_ROUTE, tab: tabFrom(current.state) };
  }

  if (MERCHANT_FLOW_NAMES.includes(current.name)) {
    const tabs = state.routes.find((route) => route.name === MERCHANT_TABS_ROUTE)?.state;
    return { stack: current.name, tab: tabFrom(tabs) };
  }

  if (MERCHANT_TAB_NAMES.includes(current.name)) {
    return { stack: MERCHANT_TABS_ROUTE, tab: current.name };
  }

  return { stack: MERCHANT_TABS_ROUTE, tab: MERCHANT_TAB_ROUTES.caisse };
}

export const MERCHANT_SPEED_DIAL_ITEMS: readonly {
  id: "smartpay" | "caisse" | "sales";
  label: string;
  icon: "home-outline" | "storefront-outline" | "stats-chart-outline";
}[] = [
  { id: "smartpay", label: "Accueil SmartPay", icon: "home-outline" },
  { id: "caisse", label: "Ma caisse", icon: "storefront-outline" },
  { id: "sales", label: "Mes ventes", icon: "stats-chart-outline" },
];

export type MerchantSpeedDialId = (typeof MERCHANT_SPEED_DIAL_ITEMS)[number]["id"];

/** Retour direct aux onglets principaux, sans retraverser les rubriques marchandes. */
export function goSmartPayHome(navigation: Nav) {
  navigation.navigate(SMARTPAY_TABS_ROUTE, { screen: SMARTPAY_HOME_TAB });
}

/** Racine marchande (tabs), en conservant la dernière rubrique si possible. */
export function goMerchantAreaHome(navigation: Nav) {
  navigation.navigate(MERCHANT_ROOT_ROUTE, { screen: MERCHANT_TABS_ROUTE });
}

export function goMerchantCaisse(navigation: Nav) {
  navigation.navigate(MERCHANT_ROOT_ROUTE, {
    screen: MERCHANT_TABS_ROUTE,
    params: { screen: MERCHANT_TAB_ROUTES.caisse },
  });
}

export function goMerchantSales(navigation: Nav) {
  navigation.navigate(MERCHANT_ROOT_ROUTE, {
    screen: MERCHANT_TABS_ROUTE,
    params: { screen: MERCHANT_TAB_ROUTES.sales },
  });
}

/** Point d'entrée Services / Profil : un seul écran racine, pas une pile de rubriques. */
export function openMerchantDemo(navigation: Nav) {
  navigation.navigate(MERCHANT_ROOT_ROUTE, {
    screen: MERCHANT_TABS_ROUTE,
    params: { screen: MERCHANT_TAB_ROUTES.caisse },
  });
}

export function isMerchantCaisseLocation(location: MerchantLocation | undefined): boolean {
  return location?.stack === MERCHANT_TABS_ROUTE && location.tab === MERCHANT_TAB_ROUTES.caisse;
}

export function speedDialVisibleOn(location: MerchantLocation | undefined): boolean {
  return location?.stack === MERCHANT_TABS_ROUTE;
}

export function runMerchantSpeedDialAction(
  navigation: Nav,
  id: MerchantSpeedDialId,
  location?: MerchantLocation,
) {
  switch (id) {
    case "smartpay":
      goSmartPayHome(navigation);
      return;
    case "caisse":
      if (isMerchantCaisseLocation(location)) {
        return;
      }
      goMerchantCaisse(navigation);
      return;
    case "sales":
      goMerchantSales(navigation);
      return;
    default:
      return;
  }
}

export function merchantTabsDoNotStack(): boolean {
  return true;
}

export function merchantDemoIsAccountBound(): boolean {
  return false;
}

export function merchantDemoRequiresDjangoShop(): boolean {
  return false;
}
