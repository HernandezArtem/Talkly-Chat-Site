import type { WidgetHistoryMessage, WidgetSessionData } from "../types";

export class WidgetSessionStore {
  constructor(
    private key?: string,
    private version = 2
  ) {}

  save(data: WidgetSessionData) {
    if (!this.key) return;

    try {
      sessionStorage.setItem(this.key, JSON.stringify({
        v: this.version,
        messages: data.messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          sources: message.sources,
          suggestions: message.suggestions,
          handoffActions: message.handoffActions,
          feedbackEnabled: message.feedbackEnabled,
          feedbackQuestion: message.feedbackQuestion,
          confidence: message.confidence,
          language: message.language,
        })),
        welcomed: data.welcomed,
      }));
    } catch {
      // sessionStorage may be unavailable.
    }
  }

  restore(): WidgetSessionData | null {
    if (!this.key) return null;

    try {
      const raw = sessionStorage.getItem(this.key);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as {
        v?: number;
        messages?: WidgetHistoryMessage[];
        welcomed?: boolean;
      };

      if (parsed.v !== this.version || !Array.isArray(parsed.messages)) {
        sessionStorage.removeItem(this.key);
        return null;
      }

      return {
        messages: parsed.messages,
        welcomed: Boolean(parsed.welcomed),
      };
    } catch {
      return null;
    }
  }

  clear() {
    if (!this.key) return;

    try {
      sessionStorage.removeItem(this.key);
    } catch {
      // Ignore storage failures.
    }
  }
}
