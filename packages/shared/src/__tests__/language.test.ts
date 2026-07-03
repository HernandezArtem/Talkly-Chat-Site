import { describe, expect, it } from "vitest";
import {
  detectChatLanguage,
  detectChatLanguageFromTexts,
  matchesLanguage,
  normalizeQuestion,
} from "../language";

describe("detectChatLanguage", () => {
  it("detects English from common product questions", () => {
    expect(detectChatLanguage("Do you have pricing information?")).toBe("en");
    expect(detectChatLanguage("How do I contact support?")).toBe("en");
  });

  it("detects Russian from common product questions", () => {
    expect(detectChatLanguage("Есть ли информация о ценах?")).toBe("ru");
    expect(detectChatLanguage("Как связаться с поддержкой?")).toBe("ru");
  });

  it("uses Cyrillic script when word lists are inconclusive", () => {
    expect(detectChatLanguage("Добрый день")).toBe("ru");
    expect(detectChatLanguage("выфвыфвыф")).toBe("ru");
  });

  it("uses Latin script when word lists are inconclusive", () => {
    expect(detectChatLanguage("asdfgh")).toBe("en");
  });

  it("respects fallback when text is empty", () => {
    expect(detectChatLanguage("", "ru")).toBe("ru");
    expect(detectChatLanguageFromTexts([], "en")).toBe("en");
  });

  it("aggregates language signals from multiple messages", () => {
    expect(
      detectChatLanguageFromTexts([
        "Сколько стоит доставка?",
        "Как связаться с поддержкой?",
      ])
    ).toBe("ru");
    expect(
      detectChatLanguageFromTexts([
        "How much does shipping cost?",
        "How do I contact support?",
      ])
    ).toBe("en");
  });
});

describe("matchesLanguage", () => {
  it("matches text to detected language", () => {
    expect(matchesLanguage("Где найти цены?", "ru")).toBe(true);
    expect(matchesLanguage("Где найти цены?", "en")).toBe(false);
    expect(matchesLanguage("Where can I find pricing?", "en")).toBe(true);
  });
});

describe("normalizeQuestion", () => {
  it("lowercases and strips punctuation", () => {
    expect(normalizeQuestion("  Hello, World!  ")).toBe("hello world");
    expect(normalizeQuestion("Цена?")).toBe("цена");
  });
});
