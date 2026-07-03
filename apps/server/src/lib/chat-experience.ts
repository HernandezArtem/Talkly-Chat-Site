import {
  normalizeQuestion,
  matchesLanguage,
  type ChatLanguage,
} from "@talkly/shared";
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

  let message = `Я не смог найти надёжный ответ в нашей базе знаний для ${tenant.name}.`;
  if (tenant.escalation?.phone) {
    message += ` Вы можете позвонить нам: ${tenant.escalation.phone}`;
    if (tenant.escalation.phoneHours) {
      message += ` (${tenant.escalation.phoneHours})`;
    }
    message += ".";
  }
  if (tenant.escalation?.url) {
    message += ` Также можно воспользоваться страницей контактов: ${tenant.escalation.url}.`;
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

  if (hasAny(haystack, ["pricing", "price", "plan", "plans", "cost", "quote", "цена", "стоимость", "тариф"])) {
    addLocalized(suggestions, opts.language,
      "Где найти цены?",
      "Where can I find pricing?"
    );
    addLocalized(suggestions, opts.language,
      "Есть ли разные тарифы?",
      "Do you offer different plans?"
    );
  }

  if (hasAny(haystack, ["shipping", "delivery", "order", "tracking", "shipment", "доставка", "заказ", "отслеживание"])) {
    addLocalized(suggestions, opts.language,
      "Какие сроки доставки?",
      "What are your shipping times?"
    );
    addLocalized(suggestions, opts.language,
      "Как отследить заказ?",
      "How do I track my order?"
    );
  }

  if (hasAny(haystack, ["return", "returns", "refund", "exchange", "cancellation", "возврат", "обмен", "возмещение"])) {
    addLocalized(suggestions, opts.language,
      "Какая у вас политика возврата?",
      "What is your return policy?"
    );
    addLocalized(suggestions, opts.language,
      "Как оформить возврат средств?",
      "How do I request a refund?"
    );
  }

  addLocalized(suggestions, opts.language,
    `Как связаться с ${opts.tenant.name}?`,
    `How do I contact ${opts.tenant.name}?`
  );

  for (const starter of opts.tenant.starterQuestions || []) {
    if (matchesLanguage(starter, opts.language)) {
      suggestions.add(starter);
    }
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
  russian: string,
  english: string
) {
  set.add(language === "en" ? english : russian);
}

function normalize(text: string): string {
  return normalizeQuestion(text);
}
