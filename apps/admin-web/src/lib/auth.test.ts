import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { UserProfile } from "@smartpay/contracts";

import { ADMIN_FORBIDDEN_MESSAGE } from "./adminGate";
import { createPortalApi, ME_PATH, TOKEN_PATH } from "./api";
import { PortalApiError } from "./errors";
import { createSessionStore } from "./session";

const admin: UserProfile = {
  id: 1,
  email: "ops@example.local",
  first_name: "Marie",
  last_name: "Diop",
  phone_number: "",
  role: "admin",
  country: "SN",
  is_active: true,
  date_joined: "2026-01-01T00:00:00Z",
};

const individual: UserProfile = { ...admin, id: 2, email: "user@example.local", role: "individual" };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("session administrateur", () => {
  it("persiste le JWT seulement après un /me/ administrateur", async () => {
    const session = createSessionStore();
    const calls: string[] = [];
    const api = createPortalApi({
      baseUrl: "http://api.test",
      session,
      fetchImpl: async (input, init) => {
        const url = String(input);
        calls.push(`${init?.method ?? "GET"} ${url}`);
        if (url.endsWith(TOKEN_PATH)) {
          const raw = String(init?.body ?? "");
          assert.equal(raw.includes("secret-local"), true);
          assert.equal(url.includes("secret-local"), false);
          assert.equal(calls.every((item) => !item.includes("secret-local")), true);
          return jsonResponse(200, { access: "access-token", refresh: "refresh-token" });
        }
        if (url.endsWith(ME_PATH)) {
          return jsonResponse(200, admin);
        }
        return jsonResponse(404, {});
      },
    });
    const profile = await api.login("ops@example.local", "secret-local");
    assert.equal(profile.role, "admin");
    assert.equal(session.read().access, "access-token");
    assert.equal(session.read().refresh, "refresh-token");
    api.logout();
    assert.equal(session.read().access, undefined);
  });

  it("refuse un JWT Particulier et n'écrit pas la session", async () => {
    const session = createSessionStore();
    const api = createPortalApi({
      baseUrl: "http://api.test",
      session,
      fetchImpl: async (input) => {
        const url = String(input);
        if (url.endsWith(TOKEN_PATH)) {
          return jsonResponse(200, { access: "access-token", refresh: "refresh-token" });
        }
        return jsonResponse(200, individual);
      },
    });
    await assert.rejects(() => api.login("user@example.local", "secret-local"), (error: unknown) => {
      assert.ok(error instanceof PortalApiError);
      assert.equal(error.status, 403);
      assert.equal(error.message, ADMIN_FORBIDDEN_MESSAGE);
      return true;
    });
    assert.equal(session.read().access, undefined);
  });

  it("mappe un mot de passe incorrect sans renvoyer de secret", async () => {
    const session = createSessionStore();
    const api = createPortalApi({
      baseUrl: "http://api.test",
      session,
      fetchImpl: async () => jsonResponse(401, { detail: "No active account found with the given credentials" }),
    });
    await assert.rejects(() => api.login("ops@example.local", "bad"), (error: unknown) => {
      assert.ok(error instanceof PortalApiError);
      assert.equal(error.status, 401);
      assert.equal(error.message, "Identifiants incorrects.");
      assert.equal(error.message.toLowerCase().includes("jwt"), false);
      return true;
    });
  });
});
