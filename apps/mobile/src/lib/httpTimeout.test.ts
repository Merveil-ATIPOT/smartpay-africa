import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ANDROID_LAN_HINT, createAbortError, fetchWithTimeout } from "./httpTimeout";

describe("fetchWithTimeout", () => {
  it("sur Android, utilise XMLHttpRequest (pas fetch+signal)", async () => {
    const calls: { method: string; url: string; timeout: number; body: string | null }[] = [];

    class FakeXHR {
      status = 200;
      statusText = "OK";
      responseText = '{"status":"ok"}';
      timeout = 0;
      private headers: Record<string, string> = {};
      open(method: string, url: string) {
        calls.push({ method, url, timeout: 0, body: null });
        this._method = method;
        this._url = url;
      }
      setRequestHeader(key: string, value: string) {
        this.headers[key] = value;
      }
      getAllResponseHeaders() {
        return "content-type: application/json\r\n";
      }
      send(body?: Document | XMLHttpRequestBodyInit | null) {
        calls[0].timeout = this.timeout;
        calls[0].body = typeof body === "string" ? body : null;
        queueMicrotask(() => this.onload?.());
      }
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      ontimeout: (() => void) | null = null;
      onabort: (() => void) | null = null;
      private _method = "GET";
      private _url = "";
    }

    const previous = globalThis.XMLHttpRequest;
    // @ts-expect-error test stub
    globalThis.XMLHttpRequest = FakeXHR;
    try {
      const fetchImpl: typeof fetch = async () => {
        throw new Error("fetch ne doit pas être appelé sur Android");
      };
      const response = await fetchWithTimeout(
        fetchImpl,
        "http://192.168.1.10:8000/api/v1/health/",
        { method: "GET", headers: { Accept: "application/json" } },
        8_000,
        "android",
      );
      assert.equal(response.status, 200);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].method, "GET");
      assert.equal(calls[0].url, "http://192.168.1.10:8000/api/v1/health/");
      assert.equal(calls[0].timeout, 8_000);
      assert.match(ANDROID_LAN_HINT, /données mobiles/i);
    } finally {
      globalThis.XMLHttpRequest = previous;
    }
  });

  it("sur Android, expire via xhr.timeout", async () => {
    class TimeoutXHR {
      timeout = 0;
      open() {}
      setRequestHeader() {}
      getAllResponseHeaders() {
        return "";
      }
      send() {
        queueMicrotask(() => this.ontimeout?.());
      }
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      ontimeout: (() => void) | null = null;
      onabort: (() => void) | null = null;
    }
    const previous = globalThis.XMLHttpRequest;
    // @ts-expect-error test stub
    globalThis.XMLHttpRequest = TimeoutXHR;
    try {
      await assert.rejects(
        () =>
          fetchWithTimeout(
            async () => new Response(""),
            "http://192.168.1.10:8000/api/v1/auth/register/",
            { method: "POST", body: "{}" },
            30,
            "android",
          ),
        (error: unknown) => error instanceof Error && error.name === "AbortError",
      );
    } finally {
      globalThis.XMLHttpRequest = previous;
    }
  });

  it("sur iOS, attache un signal d'abort à fetch", async () => {
    let receivedInit: RequestInit | undefined;
    const fetchImpl: typeof fetch = async (_url, init) => {
      receivedInit = init;
      return new Response("{}", { status: 200 });
    };
    await fetchWithTimeout(fetchImpl, "http://127.0.0.1:8000/api/v1/health/", { method: "GET" }, 1_000, "ios");
    assert.ok(receivedInit?.signal instanceof AbortSignal);
  });

  it("createAbortError produit un AbortError", () => {
    const error = createAbortError();
    assert.equal(error.name, "AbortError");
  });
});
