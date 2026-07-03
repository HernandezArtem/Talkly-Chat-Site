import { describe, expect, it } from "vitest";
import {
  getWidgetCopy,
  resolveBubbleMessage,
  resolveSubtitle,
  resolveWelcomeMessage,
} from "../copy";

describe("widget copy", () => {
  it("returns Russian and English UI strings", () => {
    expect(getWidgetCopy("ru").inputPlaceholder).toBe("Введите сообщение...");
    expect(getWidgetCopy("en").inputPlaceholder).toBe("Type a message...");
  });

  it("uses localized welcome when override language does not match", () => {
    expect(resolveWelcomeMessage("en", "Привет! Я ассистент Talkly.")).toBe(
      "Hi! I'm the Talkly assistant. How can I help?"
    );
    expect(resolveWelcomeMessage("ru", "Hi! I'm the Talkly assistant.")).toBe(
      "Привет! Я ассистент Talkly. Чем могу помочь?"
    );
  });

  it("keeps override when language matches", () => {
    const custom = "Здравствуйте! Чем помочь?";
    expect(resolveWelcomeMessage("ru", custom)).toBe(custom);
  });

  it("falls back to localized subtitle and bubble message", () => {
    expect(resolveSubtitle("ru", "Answers from your website")).toBe(
      "Ответы с вашего сайта"
    );
    expect(resolveSubtitle("en", "Ответы с вашего сайта")).toBe(
      "Answers from your website"
    );
    expect(resolveBubbleMessage("ru")).toBe("Задайте вопрос");
    expect(resolveBubbleMessage("en")).toBe("Ask a question");
  });
});
