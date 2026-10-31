import { containsSensitiveAuthText, loginUserFacingError } from "./loginForm";

export class PortalApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "PortalApiError";
  }
}

export function sanitizePortalMessage(message: string, status: number): string {
  if (!message.trim() || containsSensitiveAuthText(message)) {
    return loginUserFacingError(status);
  }
  return message.trim();
}

export function portalErrorMessage(error: unknown, statusFallback = 0): string {
  if (error instanceof PortalApiError) {
    return sanitizePortalMessage(error.message, error.status);
  }
  if (error instanceof Error) {
    return sanitizePortalMessage(error.message, statusFallback);
  }
  return loginUserFacingError(statusFallback);
}
