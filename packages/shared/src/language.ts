import { z } from "zod";

export const chatLanguageSchema = z.enum(["nl", "en"]);
export type ChatLanguage = z.infer<typeof chatLanguageSchema>;

const DUTCH_WORDS = new Set([
  "de", "het", "een", "van", "voor", "ik", "wij", "maar", "niet",
  "ook", "dit", "dat", "zijn", "hebben", "met", "als", "kan", "wel",
  "nog", "meer", "naar", "mijn", "wat", "hoe", "waar", "wanneer",
  "u", "uw", "heeft", "heb", "hebt", "kunt", "moet", "moeten",
  "welke", "deze", "die", "dan", "bij", "contact", "ondersteuning",
  "product", "producten", "bestelling", "verzending", "retour",
  "terugbetaling", "aanvraag", "aanvragen", "helpen", "hulp",
]);

const ENGLISH_WORDS = new Set([
  "the", "and", "for", "you", "your", "with", "what", "how", "where",
  "when", "do", "can", "could", "should", "have", "has", "need", "needs",
  "support", "contact", "product", "products", "order", "shipping",
  "return", "returns", "refund", "request", "pricing", "plan", "plans",
  "account", "help", "billing",
]);

export function detectChatLanguage(text: string): ChatLanguage {
  return detectChatLanguageFromTexts([text]);
}

export function detectChatLanguageFromTexts(texts: string[]): ChatLanguage {
  const words = texts.flatMap((text) =>
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .split(/\s+/)
      .filter(Boolean)
  );

  if (words.length === 0) return "en";

  let dutchHits = 0;
  let englishHits = 0;

  for (const word of words) {
    if (DUTCH_WORDS.has(word)) dutchHits++;
    if (ENGLISH_WORDS.has(word)) englishHits++;
  }

  if (dutchHits === 0 && englishHits === 0) return "en";
  if (englishHits > dutchHits) return "en";
  if (dutchHits > englishHits) return "nl";
  return "en";
}

export function normalizeQuestion(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
}
