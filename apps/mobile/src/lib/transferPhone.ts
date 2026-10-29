import { getCorridor, type DestinationCode, type OperatorId } from "./transferCorridors";

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function nationalNumber(raw: string, dialCode: string): string {
  let digits = digitsOnly(raw);
  const prefix = digitsOnly(dialCode);
  if (prefix && digits.startsWith(prefix)) {
    digits = digits.slice(prefix.length);
  }
  const lengths = lengthsForDial(dialCode);
  if (digits.startsWith("0") && lengths.includes(digits.length - 1)) {
    digits = digits.slice(1);
  }
  return digits;
}

function lengthsForDial(dialCode: string): number[] {
  const match = getCorridor(
    (["SN", "CI", "CG", "CM", "BJ", "TG", "FR"] as DestinationCode[]).find(
      (code) => getCorridor(code)?.dialCode === dialCode,
    ),
  );
  return match?.nationalLengths ?? [8];
}

export function formatInternational(code: DestinationCode, national: string): string {
  const corridor = getCorridor(code);
  if (!corridor) {
    return national;
  }
  return `${corridor.dialCode} ${national}`.trim();
}

export function phoneErrors(code: DestinationCode, raw: string): string[] {
  const corridor = getCorridor(code);
  if (!corridor) {
    return ["Pays de destination manquant."];
  }
  const national = nationalNumber(raw, corridor.dialCode);
  if (!corridor.nationalLengths.includes(national.length)) {
    return [
      `Le numéro ${corridor.dialCode} doit contenir ${corridor.nationalLengths.join(" ou ")} chiffres nationaux. Aucun compte Mobile Money n'est interrogé.`,
    ];
  }
  return [];
}

export function operatorAllowed(code: DestinationCode, operator: OperatorId | null): boolean {
  if (!operator) {
    return false;
  }
  return Boolean(getCorridor(code)?.operators.some((item) => item.id === operator));
}
