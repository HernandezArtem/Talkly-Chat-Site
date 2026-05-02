import { normalizeQuestion } from "@chattr/shared";

export class RepeatedQuestionTracker {
  private recentUserMessages: string[] = [];
  private repeatCount = 0;

  shouldEscalate(text: string): boolean {
    const normalized = normalizeQuestion(text);
    let similarCount = 0;

    for (const prev of this.recentUserMessages) {
      if (this.tokenSimilarity(normalized, normalizeQuestion(prev)) > 0.7) {
        similarCount++;
      }
    }

    this.recentUserMessages.push(text);
    if (this.recentUserMessages.length > 5) {
      this.recentUserMessages.shift();
    }

    if (similarCount >= 2) {
      this.repeatCount++;
    } else {
      this.repeatCount = 0;
    }

    return this.repeatCount >= 3;
  }

  reset() {
    this.repeatCount = 0;
  }

  private tokenSimilarity(a: string, b: string): number {
    const tokensA = new Set(a.split(/\s+/).filter(Boolean));
    const tokensB = new Set(b.split(/\s+/).filter(Boolean));
    if (tokensA.size === 0 && tokensB.size === 0) return 1;
    if (tokensA.size === 0 || tokensB.size === 0) return 0;

    let intersection = 0;
    for (const token of tokensA) {
      if (tokensB.has(token)) intersection++;
    }

    return intersection / (tokensA.size + tokensB.size - intersection);
  }
}
