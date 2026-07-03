import { detectChatLanguage, matchesLanguage, type ChatLanguage } from "@chattr/shared";
import type { EscalationConfig, WidgetHistoryMessage } from "../types";

export function getCurrentConversationLanguage(
  messages: WidgetHistoryMessage[],
  preferredLanguage: ChatLanguage
): ChatLanguage {
  const lastUser = messages.filter((message) => message.role === "user").at(-1);
  if (!lastUser) return preferredLanguage;
  return detectChatLanguage(lastUser.content, preferredLanguage);
}

export function getLastUserQuestion(messages: WidgetHistoryMessage[]): string | undefined {
  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index].role === "user") return messages[index].content;
  }

  return undefined;
}

export function getStarterSuggestions(
  starterQuestions: string[] | undefined,
  currentQuestion?: string,
  language: ChatLanguage = "en"
): string[] {
  return (starterQuestions ?? [])
    .filter((question) => question !== currentQuestion && matchesLanguage(question, language))
    .slice(0, 3);
}

export function buildConversationTranscript(
  messages: WidgetHistoryMessage[],
  language: ChatLanguage
): string {
  const userLabel = language === "en" ? "User" : "Пользователь";
  const assistantLabel = language === "en" ? "Assistant" : "Ассистент";

  return messages
    .map((message) => `${message.role === "user" ? userLabel : assistantLabel}: ${message.content}`)
    .join("\n\n");
}

export function hasRepeatEscalation(
  escalation: EscalationConfig | undefined
): escalation is EscalationConfig {
  return Boolean(escalation);
}
