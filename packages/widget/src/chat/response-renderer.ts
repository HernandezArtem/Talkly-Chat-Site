import type { ChatConfidence, ChatJsonResponse, ChatLanguage, HandoffAction, SourceCard } from "@chattr/shared";
import { matchesLanguage } from "@chattr/shared";
import { getAssistantMessageCopy, getWidgetCopy } from "../copy";
import type { WidgetFeedbackPayload, WidgetHistoryMessage } from "../types";
import type { ChatWindow } from "../ui/chat-window";
import { ChatStreamParser } from "./stream-parser";

export function renderJsonAssistantResponse(opts: {
  chatWindow: ChatWindow;
  uiLanguage: ChatLanguage;
  responseLanguage: ChatLanguage;
  response: ChatJsonResponse;
  userQuestion?: string;
  suggestions: string[];
  handoffActions: HandoffAction[];
  onSend: (question: string) => void;
  onHandoffAction: (action: HandoffAction) => void;
  onFeedbackSubmit: (payload: WidgetFeedbackPayload) => void;
}): WidgetHistoryMessage {
  const copy = getAssistantMessageCopy(opts.responseLanguage);
  const message: WidgetHistoryMessage = {
    id: crypto.randomUUID(),
    role: "assistant",
    content: opts.response.message,
    feedbackEnabled: true,
    feedbackQuestion: opts.userQuestion,
    suggestions: opts.suggestions,
    handoffActions: opts.handoffActions,
    language: opts.responseLanguage,
  };

  const component = opts.chatWindow.addMessage(message, copy);
  component.setFeedback(true, {
    question: opts.userQuestion,
    onSubmit: (payload) => opts.onFeedbackSubmit(payload),
  });

  if (opts.suggestions.length) {
    component.setSuggestions(opts.suggestions, (question) => opts.onSend(question));
  }

  if (opts.handoffActions.length) {
    component.setHandoffActions(opts.handoffActions, (action) => opts.onHandoffAction(action));
  }

  return message;
}

export class StreamResponseRenderer {
  private currentAssistantMsg: ReturnType<ChatWindow["addMessage"]> | null = null;
  private pendingSources: SourceCard[] = [];
  private pendingSuggestions: string[] = [];
  private pendingHandoffActions: HandoffAction[] = [];
  private pendingConfidence: ChatConfidence = "high";

  constructor(private opts: {
    chatWindow: ChatWindow;
    getUiLanguage: () => ChatLanguage;
    getResponseLanguage: () => ChatLanguage;
    getUserQuestion: () => string | undefined;
    getStarterSuggestions: (currentQuestion?: string, language?: ChatLanguage) => string[];
    getHandoffActions: (language: ChatLanguage) => HandoffAction[];
    onSend: (question: string) => void;
    onHandoffAction: (action: HandoffAction) => void;
    onFeedbackSubmit: (payload: WidgetFeedbackPayload) => void;
  }) {}

  async consume(response: Response): Promise<WidgetHistoryMessage | null> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    this.reset();

    const decoder = new TextDecoder();
    const parser = new ChatStreamParser();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      for (const event of parser.push(decoder.decode(value, { stream: true }))) {
        if (event.kind === "text") {
          this.appendText(event.text);
        } else if (event.kind === "source") {
          if (!this.pendingSources.some((source) => source.url === event.source.url)) {
            this.pendingSources = [...this.pendingSources, event.source];
          }
        } else if (event.kind === "data") {
          for (const item of event.items) {
            if (item.type === "suggestions") this.pendingSuggestions = item.suggestions.slice(0, 3);
            else if (item.type === "handoffActions") this.pendingHandoffActions = item.actions;
            else if (item.type === "confidence") this.pendingConfidence = item.confidence;
          }
        }
      }
    }

    for (const event of parser.flush()) {
      if (event.kind === "text") {
        this.appendText(event.text);
      }
    }

    return this.finalize();
  }

  private reset() {
    this.currentAssistantMsg = null;
    this.pendingSources = [];
    this.pendingSuggestions = [];
    this.pendingHandoffActions = [];
    this.pendingConfidence = "high";
  }

  private appendText(text: string) {
    if (!this.currentAssistantMsg) {
      this.opts.chatWindow.hideTyping();
      const responseLanguage = this.opts.getResponseLanguage();
      const copy = getAssistantMessageCopy(responseLanguage);
      const assistantMessage: WidgetHistoryMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        language: responseLanguage,
      };
      this.currentAssistantMsg = this.opts.chatWindow.addMessage(assistantMessage, copy);
    }

    this.currentAssistantMsg.appendContent(text);
    this.opts.chatWindow.scrollToBottom();
  }

  private finalize(): WidgetHistoryMessage | null {
    if (!this.currentAssistantMsg) return null;

    const responseLanguage = this.opts.getResponseLanguage();
    const userQuestion = this.opts.getUserQuestion();
    const suggestions = (this.pendingSuggestions.length
      ? this.pendingSuggestions
      : this.opts.getStarterSuggestions(userQuestion, responseLanguage)
    ).filter((suggestion) => matchesLanguage(suggestion, responseLanguage));
    const handoffActions = this.opts.getHandoffActions(responseLanguage);

    this.currentAssistantMsg.setCopy(getAssistantMessageCopy(responseLanguage));

    this.currentAssistantMsg.setConfidence(this.pendingConfidence);
    if (this.pendingSources.length) this.currentAssistantMsg.setSources(this.pendingSources);
    if (suggestions.length) {
      this.currentAssistantMsg.setSuggestions(suggestions, (question) => this.opts.onSend(question));
    }
    if (handoffActions.length) {
      this.currentAssistantMsg.setHandoffActions(handoffActions, (action) => this.opts.onHandoffAction(action));
    }
    this.currentAssistantMsg.setFeedback(true, {
      question: userQuestion,
      onSubmit: (payload) => this.opts.onFeedbackSubmit(payload),
    });

    return {
      id: this.currentAssistantMsg.data.id,
      role: "assistant",
      content: this.currentAssistantMsg.content,
      confidence: this.pendingConfidence,
      sources: this.pendingSources,
      suggestions,
      handoffActions,
      feedbackEnabled: true,
      feedbackQuestion: userQuestion,
      language: responseLanguage,
    };
  }
}
