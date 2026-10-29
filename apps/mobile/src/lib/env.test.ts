import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { defaultApiUrl, rewriteLoopbackToLan } from "./env";

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
