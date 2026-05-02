import type { DetectedChatIntent } from "../intents";
import type { RetrievedSource } from "./retrieve";

const DUTCH_ABBREVIATION_MAP: Record<string, string> = {
  faq: "veelgestelde vragen",
  btw: "belasting toegevoegde waarde",
};

/**
 * Scoring weights for the RAG re-ranker.
 *
 * After vector-similarity retrieval returns raw candidates, each result is
 * re-scored using keyword overlap, URL structure, and intent signals. The
 * final score = keywordScore - vectorDistance, so higher is better.
 *
 * Tuned against the retrieval-checks.json test suite.
 */
const WEIGHTS = {
  /** Token found in the document title. */
  titleMatch: 6,
  /** Token found in the source URL. */
  sourceMatch: 4,
  /** Token found in the document body. */
  contentMatch: 1,

  /** Penalty when the result is the site root and query has >1 token. */
  homepagePenalty: -6,
  /** Bonus when a query token appears in a URL path segment. */
  pathSegmentMatch: 3,

  /** Intent: source URL contains a boosted fragment. */
  intentSourceBoost: 12,
  /** Intent: title contains a boosted term. */
  intentTitleBoost: 5,
  /** Intent: penalty for homepage results when intent is active. */
  intentHomepagePenalty: -8,

  /** Contact intent: exact /contact path. */
  contactExactPath: 16,
  /** Contact intent: subpath under /contact/. */
  contactSubpathPenalty: -4,
  /** Contact intent: page matches a demotion term (press, complaints, etc). */
  contactDemotionTerm: -14,

  /** Confidence thresholds. */
  confidenceHighThreshold: 9,
  confidenceMediumThreshold: 4,
} as const;

export function expandAbbreviations(query: string): string {
  const tokens = query.split(/\s+/);
  const expanded: string[] = [];

  for (const token of tokens) {
    const clean = token.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
    const expansion = DUTCH_ABBREVIATION_MAP[clean];
    if (expansion) {
      expanded.push(`${token} (${expansion})`);
    } else {
      expanded.push(token);
    }
  }

  return expanded.join(" ");
}

export function scoreResult(
  query: string,
  content: string,
  source: string | undefined,
  title: string | undefined,
  distance: number,
  intent?: DetectedChatIntent | null
): number {
  const queryTokens = tokenize(query);
  const queryTokenSet = new Set(queryTokens);
  const titleTokens = new Set(tokenize(title || ""));
  const sourceTokens = new Set(tokenize(source || ""));
  const contentTokens = new Set(tokenize(content));

  let keywordScore = 0;
  for (const token of queryTokenSet) {
    if (titleTokens.has(token)) keywordScore += WEIGHTS.titleMatch;
    if (sourceTokens.has(token)) keywordScore += WEIGHTS.sourceMatch;
    if (contentTokens.has(token)) keywordScore += WEIGHTS.contentMatch;
  }

  const path = getPathname(source);
  if (path === "/" && queryTokens.length > 1) {
    keywordScore += WEIGHTS.homepagePenalty;
  }

  // URL path segments use substring matching on purpose: segments are often
  // inflected or concatenated (e.g. "contacteer", "returnpolicy") and query
  // tokens should still boost them. This is narrow enough not to mis-rank.
  if (path !== "/" && path) {
    const pathSegments = path.split("/").filter(Boolean).map((s) => s.toLowerCase());
    for (const token of queryTokenSet) {
      if (pathSegments.some((segment) => segment.includes(token))) {
        keywordScore += WEIGHTS.pathSegmentMatch;
      }
    }
  }

  if (intent) {
    const sourceText = source?.toLowerCase() || "";
    const titleText = title?.toLowerCase() || "";

    for (const fragment of intent.sourceBoosts) {
      if (sourceText.includes(fragment.toLowerCase())) {
        keywordScore += WEIGHTS.intentSourceBoost;
      }
    }

    for (const term of intent.titleBoosts) {
      if (titleText.includes(term.toLowerCase())) {
        keywordScore += WEIGHTS.intentTitleBoost;
      }
    }

    if (path === "/") {
      keywordScore += WEIGHTS.intentHomepagePenalty;
    }

    if (intent.id === "contact") {
      keywordScore += scoreContactIntent(sourceText, titleText, content.toLowerCase(), path);
    }
  }

  return keywordScore - distance;
}

export function classifyConfidence(
  topScore: number | null,
  sources: RetrievedSource[]
): "low" | "medium" | "high" {
  if (topScore == null || sources.length === 0) return "low";
  if (topScore >= WEIGHTS.confidenceHighThreshold) return "high";
  if (topScore >= WEIGHTS.confidenceMediumThreshold) return "medium";
  return "low";
}

export function dedupeSources(sources: RetrievedSource[]): RetrievedSource[] {
  const seen = new Set<string>();
  const deduped: RetrievedSource[] = [];

  for (const source of sources) {
    if (seen.has(source.url)) continue;
    seen.add(source.url);
    deduped.push(source);
  }

  return deduped;
}

function scoreContactIntent(
  sourceText: string,
  titleText: string,
  contentText: string,
  path: string
): number {
  let score = 0;

  if (path.endsWith("/contact")) {
    score += WEIGHTS.contactExactPath;
  } else if (path.includes("/contact/")) {
    score += WEIGHTS.contactSubpathPenalty;
  }

  const demotionTerms = [
    "privacy",
    "voorwaarden",
    "terms",
    "legal",
    "pers",
    "press",
    "media",
    "klacht",
    "complaint",
    "careers",
    "jobs",
    "investor",
    "fraud",
  ];
  const combinedText = `${sourceText} ${titleText} ${contentText}`;

  for (const term of demotionTerms) {
    if (combinedText.includes(term)) {
      score += WEIGHTS.contactDemotionTerm;
    }
  }

  return score;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

function getPathname(source: string | undefined): string {
  if (!source) return "";

  try {
    return new URL(source).pathname || "/";
  } catch {
    return "";
  }
}
