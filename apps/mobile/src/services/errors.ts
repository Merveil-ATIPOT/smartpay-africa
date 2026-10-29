export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body: unknown = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function isTransportError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 0 || error.status >= 500);
}

export function userFacingRequestError(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.status === 0) {
    return `${error.message} Ce n'est pas un paiement refusé.`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

function firstMessage(value: unknown, depth = 0): string | null {
  if (value == null || depth > 6) {
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstMessage(item, depth + 1);
      if (found) {
        return found;
      }
    }
    return null;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["detail", "encoded_invoice", "message", "lightning", "amount_sats", "quote", "non_field_errors"]) {
      const found = firstMessage(record[key], depth + 1);
      if (found) {
        return found;
      }
    }
    for (const nested of Object.values(record)) {
      if (typeof nested === "boolean" || typeof nested === "number") {
        continue;
      }
      const found = firstMessage(nested, depth + 1);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

export function messageFromBody(body: unknown, fallback: string): string {
  return firstMessage(body) ?? fallback;
}
