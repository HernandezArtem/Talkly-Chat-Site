import { z } from "zod";

export const chatLanguageSchema = z.enum(["en", "ru"]);
export type ChatLanguage = z.infer<typeof chatLanguageSchema>;

const RUSSIAN_WORDS = new Set([
  "и", "в", "на", "что", "как", "где", "когда", "почему", "это", "этот",
  "эта", "эти", "мой", "моя", "мои", "ваш", "ваша", "ваши", "я", "мы",
  "вы", "он", "она", "они", "не", "нет", "да", "или", "но", "для",
  "при", "по", "из", "от", "до", "за", "под", "над", "мне", "меня",
  "можно", "нужно", "хочу", "хотел", "хотела", "помогите", "помощь",
  "поддержка", "контакт", "заказ", "доставка", "возврат", "цена",
  "стоимость", "товар", "продукт", "счёт", "аккаунт", "вопрос",
  "ответ", "информация", "сайт", "страница", "ссылка", "купить",
  "оплата", "сколько", "какой", "какая", "какие", "какое", "есть",
  "был", "была", "были", "будет", "можете", "могу", "нужна", "нужен",
]);

const ENGLISH_WORDS = new Set([
  "the", "and", "for", "you", "your", "with", "what", "how", "where",
  "when", "do", "can", "could", "should", "have", "has", "need", "needs",
  "support", "contact", "product", "products", "order", "shipping",
  "return", "returns", "refund", "request", "pricing", "plan", "plans",
  "account", "help", "billing", "information", "find", "offer", "about",
  "hello", "hi", "good", "day", "much", "cost", "quote", "policy",
]);

export function detectChatLanguage(text: string, fallback: ChatLanguage = "en"): ChatLanguage {
  return detectChatLanguageFromTexts([text], fallback);
}

export function detectChatLanguageFromTexts(
  texts: string[],
  fallback: ChatLanguage = "en"
): ChatLanguage {
  const words = texts.flatMap((text) =>
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .split(/\s+/)
      .filter(Boolean)
  );

  if (words.length === 0) return fallback;

  let russianHits = 0;
  let englishHits = 0;

  for (const word of words) {
    if (RUSSIAN_WORDS.has(word)) russianHits++;
    if (ENGLISH_WORDS.has(word)) englishHits++;
  }

  if (russianHits === 0 && englishHits === 0) {
    const combined = texts.join(" ");
    if (/[\u0400-\u04FF]/.test(combined)) return "ru";
    if (/[a-zA-Z]/.test(combined)) return "en";
    return fallback;
  }
  if (englishHits > russianHits) return "en";
  if (russianHits > englishHits) return "ru";
  return fallback;
}

export function matchesLanguage(text: string, language: ChatLanguage): boolean {
  return detectChatLanguage(text) === language;
}

export function normalizeQuestion(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
}
