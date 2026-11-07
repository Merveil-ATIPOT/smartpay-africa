/**
 * Timeout HTTP fiable sur Android Expo Go.
 *
 * Sur Android, XMLHttpRequest (timeout natif) joint souvent mieux le LAN
 * que fetch() + AbortController.signal. Ailleurs : fetch + AbortSignal.
 */

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export function createAbortError(message = "Timeout"): Error {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}

export const ANDROID_LAN_HINT =
  "Désactivez les données mobiles et restez sur le même Wi-Fi que le PC (EXPO_PUBLIC_API_URL = http://<IPv4_LAN>:<port>).";

function headerRecord(headers?: HeadersInit): Record<string, string> {
  if (!headers) {
    return {};
  }
  if (headers instanceof Headers) {
    const out: Record<string, string> = {};
    headers.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers.map(([key, value]) => [key, value]));
  }
  return { ...headers };
}

function responseFromXhr(xhr: XMLHttpRequest): Response {
  const raw = xhr.getAllResponseHeaders();
  const map = new Headers();
  if (raw) {
    for (const line of raw.trim().split(/[\r\n]+/)) {
      const idx = line.indexOf(":");
      if (idx > 0) {
        map.append(line.slice(0, idx).trim(), line.slice(idx + 1).trim());
      }
    }
  }
  return new Response(xhr.responseText, {
    status: xhr.status,
    statusText: xhr.statusText,
    headers: map,
  });
}

/** Transport Android : XHR joint souvent mieux le LAN Docker que fetch(). */
export function androidXhrRequest(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(init.method ?? "GET", url, true);
    xhr.timeout = Math.max(1, timeoutMs);
    const headers = headerRecord(init.headers);
    for (const [key, value] of Object.entries(headers)) {
      if (value != null && key.toLowerCase() !== "host") {
        xhr.setRequestHeader(key, value);
      }
    }
    xhr.onload = () => resolve(responseFromXhr(xhr));
    xhr.onerror = () => reject(new TypeError("Network request failed"));
    xhr.ontimeout = () => reject(createAbortError("Timeout"));
    xhr.onabort = () => reject(createAbortError("Timeout"));
    const body = init.body;
    if (body == null) {
      xhr.send();
      return;
    }
    if (typeof body === "string" || body instanceof Blob || body instanceof ArrayBuffer) {
      xhr.send(body);
      return;
    }
    reject(new TypeError("Corps de requête non supporté sur Android XHR."));
  });
}

export async function fetchWithTimeout(
  fetchImpl: FetchLike,
  url: string,
  init: RequestInit,
  timeoutMs: number,
  platform: string,
): Promise<Response> {
  if (platform === "android") {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.info("[smartpay-net] transport xhr", init.method ?? "GET");
    }
    return androidXhrRequest(url, init, timeoutMs);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
