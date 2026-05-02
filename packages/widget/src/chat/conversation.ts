import { detectChatLanguageFromTexts, type ChatLanguage } from "@chattr/shared";
import type { EscalationConfig, WidgetHistoryMessage } from "../types";

export function getCurrentConversationLanguage(
  messages: WidgetHistoryMessage[],
  preferredLanguage: ChatLanguage
): ChatLanguage {
  const recent = messages
    .filter((message) => message.role === "user")
    .slice(-3)
    .map((message) => message.content);

  if (recent.length === 0) return preferredLanguage;
  return detectChatLanguageFromTexts(recent);
}

export function getLastUserQuestion(messages: WidgetHistoryMessage[]): string | undefined {
  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index].role === "user") return messages[index].content;
  }

  return undefined;
}

export function getStarterSuggestions(
  starterQuestions: string[] | undefined,
  currentQuestion?: string
): string[] {
  return (starterQuestions ?? [])
    .filter((question) => question !== currentQuestion)
    .slice(0, 3);
}

export function buildConversationTranscript(
  messages: WidgetHistoryMessage[],
  language: ChatLanguage
): string {
  const userLabel = language === "en" ? "User" : "Gebruiker";
  const assistantLabel = language === "en" ? "Assistant" : "Assistent";

  return messages
    .map((message) => `${message.role === "user" ? userLabel : assistantLabel}: ${message.content}`)
    .join("\n\n");
}

export function hasRepeatEscalation(
  escalation: EscalationConfig | undefined
): escalation is EscalationConfig {
  return Boolean(escalation);
}
