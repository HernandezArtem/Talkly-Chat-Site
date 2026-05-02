import { getWidgetCopy } from "../copy";
import type { WidgetHistoryMessage, WidgetFeedbackPayload, WidgetConfig } from "../types";
import type { ChatWindow } from "../ui/chat-window";
import type { HandoffAction } from "@chattr/shared";

export function restoreSessionMessages(opts: {
  messages: WidgetHistoryMessage[];
  preferredLanguage: WidgetConfig["preferredLanguage"];
  chatWindow: ChatWindow;
  onSend: (question: string) => void;
  onHandoffAction: (action: HandoffAction) => void;
  onFeedbackSubmit: (payload: WidgetFeedbackPayload) => void;
}) {
  for (const message of opts.messages) {
    const copy = getWidgetCopy(message.language ?? opts.preferredLanguage);
    const component = opts.chatWindow.addMessage(message, copy);

    if (message.role !== "assistant") continue;

    if (message.confidence) component.setConfidence(message.confidence);
    if (message.sources?.length) component.setSources(message.sources);
    if (message.suggestions?.length) {
      component.setSuggestions(message.suggestions, (question) => opts.onSend(question));
    }
    if (message.handoffActions?.length) {
      component.setHandoffActions(message.handoffActions, (action) => opts.onHandoffAction(action));
    }
    if (message.feedbackEnabled) {
      component.setFeedback(true, {
        question: message.feedbackQuestion,
        onSubmit: (payload) => opts.onFeedbackSubmit(payload),
      });
    }
  }
}
