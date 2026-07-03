import type { ChatLanguage } from "@chattr/shared";
import { matchesLanguage } from "@chattr/shared";
import type { WidgetConfig, WidgetCopy } from "./types";

const COPY: Record<ChatLanguage, WidgetCopy> = {
  en: {
    bubbleAriaLabel: "Toggle chat",
    closeNudgeAriaLabel: "Close prompt",
    closeChatAriaLabel: "Close chat",
    inputPlaceholder: "Type a message...",
    sendMessageAriaLabel: "Send message",
    retryLabel: "Retry",
    nextStepLabel: "Next step",
    directActionLabel: "Take action",
    sourcesLabel: "Sources",
    moreSourcesLabel: (count) => `More sources (${count})`,
    fewerSourcesLabel: "Fewer sources",
    feedbackPromptLabel: "Was this answer useful?",
    feedbackThanksLabel: "Thanks for your feedback",
    feedbackPositiveLabel: "Helpful",
    feedbackNegativeLabel: "Needs work",
    feedbackReasons: ["Unclear", "Answer missing", "Wrong link"],
    errorMessage: "Failed to get response.",
    defaultWelcomeMessage: "Hi! I'm the Talkly assistant. How can I help?",
    subtitle: "Answers from your website",
    bubbleMessage: "Ask a question",
    langSwitchAriaLabel: "Chat language",
    avatarAlt: "Avatar",
  },
  ru: {
    bubbleAriaLabel: "Открыть или закрыть чат",
    closeNudgeAriaLabel: "Закрыть подсказку",
    closeChatAriaLabel: "Закрыть чат",
    inputPlaceholder: "Введите сообщение...",
    sendMessageAriaLabel: "Отправить сообщение",
    retryLabel: "Повторить",
    nextStepLabel: "Следующий шаг",
    directActionLabel: "Перейти к действию",
    sourcesLabel: "Источники",
    moreSourcesLabel: (count) => `Ещё источники (${count})`,
    fewerSourcesLabel: "Меньше источников",
    feedbackPromptLabel: "Был ли этот ответ полезен?",
    feedbackThanksLabel: "Спасибо за отзыв",
    feedbackPositiveLabel: "Полезно",
    feedbackNegativeLabel: "Нужно улучшить",
    feedbackReasons: ["Непонятно", "Нет ответа", "Неверная ссылка"],
    errorMessage: "Не удалось получить ответ.",
    defaultWelcomeMessage: "Привет! Я ассистент Talkly. Чем могу помочь?",
    subtitle: "Ответы с вашего сайта",
    bubbleMessage: "Задайте вопрос",
    langSwitchAriaLabel: "Язык чата",
    avatarAlt: "Аватар",
  },
};

export function getWidgetCopy(language: ChatLanguage): WidgetCopy {
  return COPY[language];
}

/** Labels inside an assistant bubble follow the response language, not the site UI. */
export function getAssistantMessageCopy(language: ChatLanguage): WidgetCopy {
  return getWidgetCopy(language);
}

export function resolveWelcomeMessage(
  language: ChatLanguage,
  override?: string
): string {
  if (override && matchesLanguage(override, language)) return override;
  return COPY[language].defaultWelcomeMessage;
}

export function resolveSubtitle(
  language: ChatLanguage,
  themeSubtitle?: string
): string {
  if (themeSubtitle && matchesLanguage(themeSubtitle, language)) return themeSubtitle;
  return COPY[language].subtitle;
}

export function resolveBubbleMessage(
  language: ChatLanguage,
  override?: string
): string {
  if (override && matchesLanguage(override, language)) return override;
  return COPY[language].bubbleMessage;
}

export function buildRepeatEscalationMessage(
  language: ChatLanguage,
  escalation: WidgetConfig["escalation"]
): string {
  if (language === "en") {
    let message = "It seems I'm unable to fully help with this question.";
    if (escalation?.phone) message += ` You can call us at ${escalation.phone}.`;
    if (escalation?.url) message += ` Or visit ${escalation.url}.`;
    if (escalation?.email) message += ` Or email ${escalation.email}.`;
    return message;
  }

  let message = "Похоже, я не могу полностью помочь с этим вопросом.";
  if (escalation?.phone) message += ` Вы можете позвонить нам: ${escalation.phone}.`;
  if (escalation?.url) message += ` Или перейти на ${escalation.url}.`;
  if (escalation?.email) message += ` Или написать на ${escalation.email}.`;
  return message;
}
