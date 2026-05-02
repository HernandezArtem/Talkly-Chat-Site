import {
  normalizeQuestion,
  type ChatLanguage,
} from "@chattr/shared";
import type { DetectedChatIntent } from "./intents";
import { getIntentSuggestions } from "./intents";
import type { RetrievedSource } from "./rag/retrieve";
import type { TenantConfig } from "./tenant";

export function buildLowConfidenceMessage(
  tenant: TenantConfig,
  language: ChatLanguage
): string {
  if (language === "en") {
    let message = `I couldn't find a reliable answer in our knowledge base for ${tenant.name}.`;
    if (tenant.escalation?.phone) {
      message += ` You can call us at ${tenant.escalation.phone}`;
      if (tenant.escalation.phoneHours) {
        message += ` (${tenant.escalation.phoneHours})`;
      }
      message += ".";
    }
    if (tenant.escalation?.url) {
      message += ` You can also use our contact page: ${tenant.escalation.url}.`;
    }
    return message;
  }

  let message = `Ik kon geen betrouwbaar antwoord vinden in onze kennisbank voor ${tenant.name}.`;
  if (tenant.escalation?.phone) {
    message += ` U kunt ons bellen op ${tenant.escalation.phone}`;
    if (tenant.escalation.phoneHours) {
      message += ` (${tenant.escalation.phoneHours})`;
    }
    message += ".";
  }
  if (tenant.escalation?.url) {
    message += ` U kunt ook onze contactpagina gebruiken: ${tenant.escalation.url}.`;
  }
  return message;
}

export function buildFollowUpSuggestions(opts: {
  query: string;
  sources: RetrievedSource[];
  tenant: TenantConfig;
  language: ChatLanguage;
  intent?: DetectedChatIntent | null;
}): string[] {
  const haystack = `${opts.query} ${opts.sources.map((source) => `${source.title} ${source.url}`).join(" ")}`.toLowerCase();

  const suggestions = new Set<string>();

  for (const suggestion of getIntentSuggestions(opts.intent ?? null, opts.language)) {
    suggestions.add(suggestion);
  }

  if (hasAny(haystack, ["pricing", "price", "plan", "plans", "cost", "quote"])) {
    addLocalized(suggestions, opts.language,
      "Waar vind ik de prijzen?",
      "Where can I find pricing?"
    );
    addLocalized(suggestions, opts.language,
      "Zijn er verschillende plannen?",
      "Do you offer different plans?"
    );
  }

  if (hasAny(haystack, ["shipping", "delivery", "order", "tracking", "shipment"])) {
    addLocalized(suggestions, opts.language,
      "Wat zijn de verzendtijden?",
      "What are your shipping times?"
    );
    addLocalized(suggestions, opts.language,
      "Hoe volg ik mijn bestelling?",
      "How do I track my order?"
    );
  }

  if (hasAny(haystack, ["return", "returns", "refund", "exchange", "cancellation"])) {
    addLocalized(suggestions, opts.language,
      "Wat is jullie retourbeleid?",
      "What is your return policy?"
    );
    addLocalized(suggestions, opts.language,
      "Hoe vraag ik een terugbetaling aan?",
      "How do I request a refund?"
    );
  }

  addLocalized(suggestions, opts.language,
    `Hoe neem ik contact op met ${opts.tenant.name}?`,
    `How do I contact ${opts.tenant.name}?`
  );

  for (const starter of opts.tenant.starterQuestions || []) {
    suggestions.add(starter);
  }

  return [...suggestions]
    .filter((suggestion) => normalize(suggestion) !== normalize(opts.query))
    .slice(0, 3);
}

function hasAny(haystack: string, terms: string[]): boolean {
  return terms.some((term) => haystack.includes(term));
}

function addLocalized(
  set: Set<string>,
  language: ChatLanguage,
  dutch: string,
  english: string
) {
  set.add(language === "en" ? english : dutch);
}

function normalize(text: string): string {
  return normalizeQuestion(text);
}
