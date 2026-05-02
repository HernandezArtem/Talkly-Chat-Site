import type { ChatLanguage } from "@chattr/shared";
import type { WidgetConfig, WidgetCopy } from "./types";

export function getWidgetCopy(language: ChatLanguage): WidgetCopy {
  if (language === "en") {
    return {
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
      defaultWelcomeMessage: "How can I help you?",
    };
  }

  return {
    bubbleAriaLabel: "Chat openen of sluiten",
    closeNudgeAriaLabel: "Melding sluiten",
    closeChatAriaLabel: "Chat sluiten",
    inputPlaceholder: "Typ een bericht...",
    sendMessageAriaLabel: "Bericht versturen",
    retryLabel: "Opnieuw proberen",
    nextStepLabel: "Volgende stap",
    directActionLabel: "Direct regelen",
    sourcesLabel: "Bronnen",
    moreSourcesLabel: (count) => `Meer bronnen (${count})`,
    fewerSourcesLabel: "Minder bronnen",
    feedbackPromptLabel: "Was dit antwoord nuttig?",
    feedbackThanksLabel: "Bedankt voor uw feedback",
    feedbackPositiveLabel: "Handig",
    feedbackNegativeLabel: "Kan beter",
    feedbackReasons: ["Onduidelijk", "Antwoord ontbreekt", "Verkeerde link"],
    errorMessage: "Er ging iets mis bij het ophalen van een antwoord.",
    defaultWelcomeMessage: "Waarmee kan ik u helpen?",
  };
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

  let message = "Het lijkt erop dat ik u niet volledig kan helpen met deze vraag.";
  if (escalation?.phone) message += ` U kunt ons bellen op ${escalation.phone}.`;
  if (escalation?.url) message += ` Of bezoek ${escalation.url}.`;
  if (escalation?.email) message += ` Of mail naar ${escalation.email}.`;
  return message;
}
