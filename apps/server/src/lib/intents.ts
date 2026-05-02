import INTENT_RULES_JSON from "./intents.json";

export interface DetectedChatIntent {
  id: string;
  score: number;
  sourceBoosts: string[];
  titleBoosts: string[];
  suggestions: {
    nl: string[];
    en: string[];
  };
  preferHandoff?: boolean;
}

interface IntentRule {
  id: string;
  tenants: string[];
  phrases: string[];
  keywords: string[];
  requiredGroups?: string[][];
  sourceBoosts: string[];
  titleBoosts: string[];
  suggestions: {
    nl: string[];
    en: string[];
  };
  preferHandoff?: boolean;
  minScore?: number;
}

const INTENT_RULES: IntentRule[] = INTENT_RULES_JSON;

export function detectChatIntent(
  tenantId: string,
  query: string
): DetectedChatIntent | null {
  const normalized = normalize(query);
  const tokens = tokenize(normalized);

  if (!normalized) return null;

  let bestMatch: DetectedChatIntent | null = null;

  for (const rule of INTENT_RULES) {
    if (!rule.tenants.includes(tenantId)) continue;

    const score = scoreRule(rule, normalized, tokens);
    if (score < (rule.minScore ?? 3)) continue;

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        id: rule.id,
        score,
        sourceBoosts: rule.sourceBoosts,
        titleBoosts: rule.titleBoosts,
        suggestions: rule.suggestions,
        preferHandoff: rule.preferHandoff,
      };
    }
  }

  return bestMatch;
}

export function getIntentSuggestions(
  intent: DetectedChatIntent | null,
  language: "nl" | "en"
): string[] {
  if (!intent) return [];
  return dedupe(intent.suggestions[language]);
}

function scoreRule(rule: IntentRule, normalized: string, tokens: string[]): number {
  let score = 0;

  for (const phrase of rule.phrases) {
    if (matchesTerm(normalized, tokens, phrase)) {
      score += phrase.includes(" ") ? 5 : 3;
    }
  }

  let keywordHits = 0;
  for (const keyword of rule.keywords) {
    if (matchesTerm(normalized, tokens, keyword)) {
      keywordHits++;
    }
  }
  score += keywordHits * 2;

  for (const group of rule.requiredGroups || []) {
    const matched = group.some((term) => matchesTerm(normalized, tokens, term));
    if (!matched) return 0;
    score += 1;
  }

  return score;
}

function matchesTerm(normalized: string, tokens: string[], term: string): boolean {
  const normalizedTerm = normalize(term);

  if (normalizedTerm.includes(" ")) {
    return normalized.includes(normalizedTerm);
  }

  return tokens.some((token) =>
    token === normalizedTerm
      || token.includes(normalizedTerm)
      || normalizedTerm.includes(token)
  );
}

function tokenize(text: string): string[] {
  return text
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
