import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  defaultApiUrl,
  isPrivateLanIpv4,
  resolveApiBaseUrl,
  rewriteLoopbackToLan,
} from "./env";

describe("defaultApiUrl", () => {
  it("pointe l'émulateur Android vers 10.0.2.2", () => {
    const previous = process.env.EXPO_PUBLIC_API_URL;
    delete process.env.EXPO_PUBLIC_API_URL;
    try {
      assert.equal(defaultApiUrl("android"), "http://10.0.2.2:8000");
      assert.equal(defaultApiUrl("ios"), "http://127.0.0.1:8000");
    } finally {
      if (previous === undefined) {
        delete process.env.EXPO_PUBLIC_API_URL;
      } else {
        process.env.EXPO_PUBLIC_API_URL = previous;
      }
    }
  });

  it("honore EXPO_PUBLIC_API_URL", () => {
    const previous = process.env.EXPO_PUBLIC_API_URL;
    process.env.EXPO_PUBLIC_API_URL = "http://192.168.1.12:8000/";
    try {
      assert.equal(defaultApiUrl("android"), "http://192.168.1.12:8000");
    } finally {
      if (previous === undefined) {
        delete process.env.EXPO_PUBLIC_API_URL;
      } else {
        process.env.EXPO_PUBLIC_API_URL = previous;
      }
    }
  });
});

describe("rewriteLoopbackToLan", () => {
  it("remplace localhost par l'IP LAN de Metro sur un téléphone", () => {
    assert.equal(
      rewriteLoopbackToLan("http://localhost:8000", "192.168.1.12:8082"),
      "http://192.168.1.12:8000",
    );
    assert.equal(
      rewriteLoopbackToLan("http://127.0.0.1:8000", "192.168.1.12:8082"),
      "http://192.168.1.12:8000",
    );
  });

  it("ne touche pas une URL déjà en IP LAN ni un simulateur localhost", () => {
    assert.equal(
      rewriteLoopbackToLan("http://192.168.1.12:8000", "192.168.1.12:8082"),
      "http://192.168.1.12:8000",
    );
    assert.equal(rewriteLoopbackToLan("http://localhost:8000", "localhost:8081"), "http://localhost:8000");
  });
});

describe("resolveApiBaseUrl", () => {
  it("remplace une IP LAN SecureStore périmée par EXPO_PUBLIC", () => {
    assert.equal(isPrivateLanIpv4("192.168.1.3"), true);
    assert.equal(isPrivateLanIpv4("10.0.2.2"), false);
    const resolved = resolveApiBaseUrl({
      override: "http://192.168.1.3:8000",
      envUrl: "http://192.168.1.10:8000",
      metroHost: "192.168.1.10:8084",
    });
    assert.equal(resolved.base, "http://192.168.1.10:8000");
    assert.equal(resolved.replacedStaleOverride, true);
    assert.equal(resolved.previousOverride, "http://192.168.1.3:8000");
    assert.equal(resolved.persistReplacement, false);
  });

  it("conserve un override LAN identique à l'env", () => {
    const resolved = resolveApiBaseUrl({
      override: "http://192.168.1.10:8000",
      envUrl: "http://192.168.1.10:8000",
      metroHost: "192.168.1.10:8084",
    });
    assert.equal(resolved.base, "http://192.168.1.10:8000");
    assert.equal(resolved.replacedStaleOverride, false);
  });

  it("un ancien SecureStore au même hôte cède le port à EXPO_PUBLIC_API_URL", () => {
    const resolved = resolveApiBaseUrl({
      override: "http://192.168.50.8:8000",
      explicit: false,
      envUrl: "http://192.168.50.8:8085",
      metroHost: "192.168.50.8:8084",
    });
    assert.equal(resolved.base, "http://192.168.50.8:8085");
    assert.equal(resolved.replacedStaleOverride, true);
    assert.equal(resolved.persistReplacement, false);
  });

  it("conserve après redémarrage une URL explicitement choisie", () => {
    const resolved = resolveApiBaseUrl({
      override: "http://192.168.50.9:9000",
      explicit: true,
      envUrl: "http://192.168.50.8:8085",
      metroHost: "192.168.50.8:8084",
    });
    assert.equal(resolved.base, "http://192.168.50.9:9000");
    assert.equal(resolved.replacedStaleOverride, false);
    assert.equal(resolved.persistReplacement, false);
  });

  it("ne réécrit pas l'hôte d'une URL explicitement choisie", () => {
    const resolved = resolveApiBaseUrl({
      override: "http://192.168.50.4:9000",
      explicit: true,
      envUrl: "http://192.168.50.8:8085",
      metroHost: "192.168.50.8:8084",
    });
    assert.equal(resolved.base, "http://192.168.50.4:9000");
    assert.equal(resolved.replacedStaleOverride, false);
    assert.equal(resolved.persistReplacement, false);
  });

  it("une réinitialisation (override vide) revient à EXPO_PUBLIC_API_URL", () => {
    const resolved = resolveApiBaseUrl({
      override: "  ",
      explicit: true,
      envUrl: "http://192.168.50.8:8085/",
      metroHost: "192.168.50.8:8084",
    });
    assert.equal(resolved.base, "http://192.168.50.8:8085");
    assert.equal(resolved.replacedStaleOverride, false);
  });

  it("sans override, utilise l'env réécrit via Metro", () => {
    const resolved = resolveApiBaseUrl({
      override: null,
      envUrl: "http://127.0.0.1:8000",
      metroHost: "192.168.1.10:8084",
    });
    assert.equal(resolved.base, "http://192.168.1.10:8000");
    assert.equal(resolved.replacedStaleOverride, false);
  });
});
