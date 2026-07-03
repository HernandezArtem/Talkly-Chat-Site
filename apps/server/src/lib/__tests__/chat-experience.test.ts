import { describe, expect, it } from "vitest";
import { buildFollowUpSuggestions, buildLowConfidenceMessage } from "../chat-experience";
import type { TenantConfig } from "../tenant";

const tenant: TenantConfig = {
  name: "Talkly Demo",
  dbPath: "./data/default.db",
  scrapeUrl: "https://example.com",
  starterQuestions: [
    "Как связаться с поддержкой?",
    "How do I contact support?",
    "Есть ли информация о ценах?",
    "Do you have pricing information?",
  ],
  escalation: {
    url: "https://example.com/contact",
  },
};

describe("buildLowConfidenceMessage", () => {
  it("returns localized fallback with contact link", () => {
    const ru = buildLowConfidenceMessage(tenant, "ru");
    const en = buildLowConfidenceMessage(tenant, "en");

    expect(ru).toContain("Talkly Demo");
    expect(ru).toContain("example.com/contact");
    expect(en).toContain("knowledge base");
    expect(en).toContain("example.com/contact");
  });
});

describe("buildFollowUpSuggestions", () => {
  it("returns only Russian starters for Russian queries", () => {
    const suggestions = buildFollowUpSuggestions({
      query: "цены",
      sources: [],
      tenant,
      language: "ru",
      intent: null,
    });

    expect(suggestions.some((s) => /[а-яё]/i.test(s))).toBe(true);
    expect(suggestions.some((s) => /^How do I contact/i.test(s))).toBe(false);
  });

  it("returns only English starters for English queries", () => {
    const suggestions = buildFollowUpSuggestions({
      query: "pricing",
      sources: [],
      tenant,
      language: "en",
      intent: null,
    });

    expect(suggestions.some((s) => /^How do I contact/i.test(s))).toBe(true);
    expect(suggestions.some((s) => /Как связаться/i.test(s))).toBe(false);
  });
});
