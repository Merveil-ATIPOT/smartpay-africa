export type TransferRegion = "all" | "uemoa" | "cemac" | "intl";
export type DestinationCode = "SN" | "CI" | "CG" | "CM" | "BJ" | "TG" | "FR";
export type OperatorId = "wave" | "orange" | "mtn" | "free" | "airtel" | "moov" | "tmoney";

export type Operator = {
  id: OperatorId;
  label: string;
  shortLabel: string;
};

export type CorridorCountry = {
  code: DestinationCode;
  name: string;
  flag: string;
  currency: "XOF" | "XAF" | "EUR";
  currencyLabel: string;
  region: Exclude<TransferRegion, "all">;
  recommended: boolean;
  available: boolean;
  operators: Operator[];
  dialCode: string;
  nationalLengths: number[];
  searchText: string;
};

const WAVE: Operator = { id: "wave", label: "Wave", shortLabel: "Wave" };
const ORANGE: Operator = { id: "orange", label: "Orange Money", shortLabel: "Orange" };
const MTN: Operator = { id: "mtn", label: "MTN Money", shortLabel: "MTN" };
const FREE: Operator = { id: "free", label: "Free Money", shortLabel: "Free Money" };
const AIRTEL: Operator = { id: "airtel", label: "Airtel Money", shortLabel: "Airtel" };
const MOOV: Operator = { id: "moov", label: "Moov", shortLabel: "Moov" };
const TMONEY: Operator = { id: "tmoney", label: "T-Money", shortLabel: "T-Money" };

export const CORRIDORS: CorridorCountry[] = [
  {
    code: "SN",
    name: "Sénégal",
    flag: "🇸🇳",
    currency: "XOF",
    currencyLabel: "XOF · Franc CFA d'Afrique de l'Ouest",
    region: "uemoa",
    recommended: true,
    available: true,
    operators: [WAVE, ORANGE, FREE],
    dialCode: "+221",
    nationalLengths: [9],
    searchText: "senegal senegal wave orange free money xof",
  },
  {
    code: "CI",
    name: "Côte d'Ivoire",
    flag: "🇨🇮",
    currency: "XOF",
    currencyLabel: "XOF · Franc CFA d'Afrique de l'Ouest",
    region: "uemoa",
    recommended: true,
    available: true,
    operators: [WAVE, MTN, ORANGE],
    dialCode: "+225",
    nationalLengths: [8, 10],
    searchText: "cote d'ivoire cote divoire ivory wave mtn orange xof",
  },
  {
    code: "CG",
    name: "Congo-Brazzaville",
    flag: "🇨🇬",
    currency: "XAF",
    currencyLabel: "XAF · Franc CFA d'Afrique Centrale",
    region: "cemac",
    recommended: true,
    available: true,
    operators: [MTN, AIRTEL],
    dialCode: "+242",
    nationalLengths: [9],
    searchText: "congo brazzaville mtn airtel xaf",
  },
  {
    code: "CM",
    name: "Cameroun",
    flag: "🇨🇲",
    currency: "XAF",
    currencyLabel: "XAF",
    region: "cemac",
    recommended: false,
    available: true,
    operators: [MTN, ORANGE],
    dialCode: "+237",
    nationalLengths: [9],
    searchText: "cameroun cameroon mtn orange xaf",
  },
  {
    code: "BJ",
    name: "Bénin",
    flag: "🇧🇯",
    currency: "XOF",
    currencyLabel: "XOF",
    region: "uemoa",
    recommended: false,
    available: true,
    operators: [MTN, MOOV],
    dialCode: "+229",
    nationalLengths: [8],
    searchText: "benin mtn moov xof",
  },
  {
    code: "TG",
    name: "Togo",
    flag: "🇹🇬",
    currency: "XOF",
    currencyLabel: "XOF",
    region: "uemoa",
    recommended: false,
    available: true,
    operators: [TMONEY, MOOV],
    dialCode: "+228",
    nationalLengths: [8],
    searchText: "togo t-money tmoney moov xof",
  },
  {
    code: "FR",
    name: "France / Europe",
    flag: "🇪🇺",
    currency: "EUR",
    currencyLabel: "Virement SEPA · EUR",
    region: "intl",
    recommended: false,
    available: false,
    operators: [],
    dialCode: "+33",
    nationalLengths: [9],
    searchText: "france europe sepa euro eur international",
  },
];

export function foldText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function getCorridor(code: DestinationCode | null | undefined): CorridorCountry | undefined {
  return CORRIDORS.find((item) => item.code === code);
}

export function corridorsFromCatalog(
  results: {
    code: string;
    name: string;
    currency: "XOF" | "XAF" | "EUR";
    region: "uemoa" | "cemac" | "intl";
    recommended: boolean;
    available: boolean;
    dial_code: string;
    operators: { id: OperatorId; label: string; short_label: string }[];
  }[],
): CorridorCountry[] {
  return results.map((item) => {
    const local = getCorridor(item.code as DestinationCode);
    return {
      code: item.code as DestinationCode,
      name: item.name,
      flag: local?.flag ?? "🏳️",
      currency: item.currency,
      currencyLabel: local?.currencyLabel ?? item.currency,
      region: item.region,
      recommended: item.recommended,
      available: item.available,
      operators: item.operators.map((op) => ({
        id: op.id,
        label: op.label,
        shortLabel: op.short_label,
      })),
      dialCode: item.dial_code || local?.dialCode || "",
      nationalLengths: local?.nationalLengths ?? [8],
      searchText: local?.searchText ?? `${item.name} ${item.code}`,
    };
  });
}

export function filterCorridors(
  query: string,
  region: TransferRegion,
  list: CorridorCountry[] = CORRIDORS,
): CorridorCountry[] {
  const needle = foldText(query.trim());
  return list.filter((item) => {
    if (region !== "all" && item.region !== region) {
      return false;
    }
    if (!needle) {
      return true;
    }
    return foldText(`${item.name} ${item.code} ${item.searchText} ${item.operators.map((op) => op.label).join(" ")}`).includes(
      needle,
    );
  });
}

export type DemoRecipient = {
  name: string;
  country: DestinationCode;
  operator: OperatorId;
  nationalNumber: string;
  reason: string;
};

export const DEMO_RECIPIENTS: DemoRecipient[] = [
  { name: "Awa Koné", country: "CI", operator: "wave", nationalNumber: "07458912", reason: "Soutien familial" },
  { name: "Koffi Yao", country: "CI", operator: "orange", nationalNumber: "05123456", reason: "Paiement boutique" },
  { name: "Fatou Diallo", country: "SN", operator: "wave", nationalNumber: "771234567", reason: "Soutien familial" },
  { name: "Jean Mbemba", country: "CG", operator: "mtn", nationalNumber: "066123456", reason: "Frais scolaires" },
];

export function demoRecipientsFor(code: DestinationCode): DemoRecipient[] {
  return DEMO_RECIPIENTS.filter((item) => item.country === code);
}
