import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AssistantConversation, AssistantMessage } from "@smartpay/contracts";

import {
  assistantChatCopyHasForbiddenClaim,
  collectAllPages,
  mergeExchange,
  newAssistantIdempotencyKey,
  nextPagePath,
  pickResumeConversation,
  sortConversationsForDisplay,
  visibleAssistantChatCopy,
} from "./assistantChat";

function message(partial: Partial<AssistantMessage>): AssistantMessage {
  return {
    id: "m1",
    role: "user",
    content: "Bonjour",
    response_type: "",
    created_at: "2026-10-31T10:00:00Z",
    ...partial,
  };
}

describe("conversation M34", () => {
  it("n'invente pas les chiffres Stitch", () => {
    const copy = visibleAssistantChatCopy();
    assert.equal(assistantChatCopyHasForbiddenClaim(copy), false);
    assert.equal(copy.includes("SN-8924"), false);
    assert.equal(copy.includes("SmartPay AI v2.4"), false);
  });

  it("produit des clés d'idempotence distinctes", () => {
    const first = newAssistantIdempotencyKey(1);
    const second = newAssistantIdempotencyKey(1);
    assert.notEqual(first, second);
    assert.match(first, /^ai03-/);
  });

  it("évite les doublons lors d'un échange rejoué", () => {
    const user = message({ id: "u1", role: "user" });
    const assistant = message({
      id: "a1",
      role: "assistant",
      content: "Bitcoin est un réseau pair-à-pair.",
      response_type: "faq",
      created_at: "2026-10-31T10:00:01Z",
    });
    const once = mergeExchange([], user, assistant);
    const twice = mergeExchange(once, user, assistant);
    assert.equal(once.length, 2);
    assert.equal(twice.length, 2);
    assert.deepEqual(
      twice.map((item) => item.id),
      ["u1", "a1"],
    );
  });

  it("reprend la conversation qui a des messages, pas une coquille vide récente", () => {
    const empty: AssistantConversation = {
      id: "empty",
      title: "Nouvelle conversation",
      created_at: "2026-10-31T12:00:00Z",
      updated_at: "2026-10-31T12:00:00Z",
      message_count: 0,
    };
    const filled: AssistantConversation = {
      id: "filled",
      title: "Qu'est-ce que Lightning ?",
      created_at: "2026-10-30T10:00:00Z",
      updated_at: "2026-10-30T10:05:00Z",
      message_count: 4,
    };
    assert.equal(pickResumeConversation([empty, filled])?.id, "filled");
    assert.equal(sortConversationsForDisplay([empty, filled])[0].id, "filled");
    assert.equal(pickResumeConversation([]), null);
  });

  it("suit les pages suivantes sans inventer de lignes", async () => {
    assert.equal(
      nextPagePath("http://10.0.2.2:8000/api/v1/ai/conversations/?page=2"),
      "/api/v1/ai/conversations/?page=2",
    );
    const pages = new Map([
      [
        "/first",
        {
          count: 3,
          next: "http://api.test/api/v1/ai/conversations/?page=2",
          results: [{ id: "a" }, { id: "b" }],
        },
      ],
      [
        "/api/v1/ai/conversations/?page=2",
        { count: 3, next: null, results: [{ id: "c" }] },
      ],
    ]);
    const items = await collectAllPages("/first", async (path) => {
      const page = pages.get(path);
      assert.ok(page);
      return page;
    });
    assert.deepEqual(
      items.map((item) => item.id),
      ["a", "b", "c"],
    );
  });
});
