import { buildHandoffActions, type ChatLanguage, type HandoffAction } from "@chattr/shared";
import { resolveTheme } from "./theme/engine";
import { WidgetContainer } from "./ui/container";
import { ChatBubble } from "./ui/bubble";
import { ChatWindow } from "./ui/chat-window";
import { ChatApiClient } from "./chat/api-client";
import { WidgetSessionStore } from "./chat/session-store";
import { RepeatedQuestionTracker } from "./chat/repeat-tracker";
import { getWidgetCopy, buildRepeatEscalationMessage } from "./copy";
import type { WidgetConfig, WidgetFeedbackPayload, WidgetHistoryMessage } from "./types";
import {
  buildConversationTranscript,
  getCurrentConversationLanguage,
  getLastUserQuestion,
  getStarterSuggestions,
  hasRepeatEscalation,
} from "./chat/conversation";
import { renderJsonAssistantResponse, StreamResponseRenderer } from "./chat/response-renderer";
import { restoreSessionMessages } from "./chat/session-renderer";

export class Widget {
  private container: WidgetContainer;
  private bubble: ChatBubble;
  private chatWindow: ChatWindow;
  private apiClient: ChatApiClient;
  private sessionStore: WidgetSessionStore;
  private repeatTracker = new RepeatedQuestionTracker();
  private isOpen = false;
  private hasShownWelcomeMessage = false;
  private messageHistory: WidgetHistoryMessage[] = [];
  private streamRenderer: StreamResponseRenderer;

  constructor(private config: WidgetConfig) {
    const theme = resolveTheme(config.theme);
    const initialCopy = getWidgetCopy(config.preferredLanguage);

    this.apiClient = new ChatApiClient(config.serverUrl, config.tenantId);
    this.sessionStore = new WidgetSessionStore(config.sessionKey);

    this.container = new WidgetContainer(config.theme);
    this.bubble = new ChatBubble(theme.position, initialCopy, () => this.toggle());
    this.bubble.mount(this.container.shadow);

    this.chatWindow = new ChatWindow(
      { title: theme.title, subtitle: theme.subtitle, avatarUrl: theme.avatarUrl, position: theme.position },
      initialCopy,
      (text) => this.handleSend(text),
      () => this.toggle()
    );
    this.chatWindow.mount(this.container.shadow);

    this.streamRenderer = new StreamResponseRenderer({
      chatWindow: this.chatWindow,
      getLanguage: () => this.getCurrentLanguage(),
      getUserQuestion: () => this.getLastUserQuestion(),
      getStarterSuggestions: (question) => this.getStarterSuggestions(question),
      getHandoffActions: (language) => this.getHandoffActions(language),
      onSend: (question) => this.handleSend(question),
      onHandoffAction: (action) => this.handleHandoffAction(action),
      onFeedbackSubmit: (payload) => this.submitFeedback(payload),
    });

    this.restoreSession();

    if (config.bubbleMessage) {
      const delay = config.bubbleDelay ?? 5000;
      setTimeout(() => { if (!this.isOpen) this.bubble.showNudge(config.bubbleMessage!, () => this.toggle()); }, delay);
    }
  }

  private toggle() {
    this.isOpen = !this.isOpen;
    this.bubble.setOpen(this.isOpen);
    if (this.isOpen) {
      this.bubble.hideNudge();
      this.chatWindow.open();
      this.showWelcomeMessage();
    } else {
      this.chatWindow.close();
      this.bubble.el.focus();
    }
  }

  private showWelcomeMessage() {
    if (this.hasShownWelcomeMessage || (!this.config.welcomeMessage && !this.config.starterQuestions?.length)) return;
    const language = this.getCurrentLanguage();
    const copy = getWidgetCopy(language);
    const welcomeMessage: WidgetHistoryMessage = {
      id: crypto.randomUUID(), role: "assistant",
      content: this.config.welcomeMessage || copy.defaultWelcomeMessage, language,
    };
    const welcomeComponent = this.chatWindow.addMessage(welcomeMessage, copy);
    if (this.config.starterQuestions?.length) {
      welcomeComponent.setSuggestions(this.config.starterQuestions.slice(0, 3), (q) => this.handleSend(q));
    }
    this.chatWindow.scrollMessageToTop(welcomeComponent);
    this.hasShownWelcomeMessage = true;
  }

  private async handleSend(text: string) {
    const userMsg: WidgetHistoryMessage = { id: crypto.randomUUID(), role: "user", content: text };
    this.messageHistory.push(userMsg);
    this.chatWindow.addMessage(userMsg, getWidgetCopy(this.getCurrentLanguage()));

    if (this.repeatTracker.shouldEscalate(text) && hasRepeatEscalation(this.config.escalation)) {
      const language = this.getCurrentLanguage();
      const handoffActions = this.getHandoffActions(language);
      const escalationMsg: WidgetHistoryMessage = {
        id: crypto.randomUUID(), role: "assistant",
        content: buildRepeatEscalationMessage(language, this.config.escalation),
        handoffActions, suggestions: this.getStarterSuggestions(text), language,
      };
      const component = this.chatWindow.addMessage(escalationMsg, getWidgetCopy(language));
      if (handoffActions.length) component.setHandoffActions(handoffActions, (a) => this.handleHandoffAction(a));
      if (escalationMsg.suggestions?.length) component.setSuggestions(escalationMsg.suggestions, (q) => this.handleSend(q));
      this.messageHistory.push(escalationMsg);
      this.saveSession();
      this.repeatTracker.reset();
      return;
    }

    this.chatWindow.setLoading(true);
    this.chatWindow.showTyping();
    try {
      await this.streamResponse();
    } catch {
      const copy = getWidgetCopy(this.getCurrentLanguage());
      this.chatWindow.hideTyping();
      this.chatWindow.setLoading(false);
      this.chatWindow.showError(copy.errorMessage, () => this.handleSend(text));
    }
  }

  private async streamResponse() {
    const result = await this.apiClient.sendChat({
      messages: this.messageHistory.map(({ id, role, content }) => ({ id, role, content })),
      context: this.config.context,
    });

    if (result.kind === "json") {
      this.chatWindow.hideTyping();
      const language = this.getCurrentLanguage();
      const userQuestion = this.getLastUserQuestion();
      const suggestions = result.data.suggestions?.length ? result.data.suggestions : this.getStarterSuggestions(userQuestion);
      const handoffActions = result.data.handoffActions?.length ? result.data.handoffActions : this.getHandoffActions(language);
      const msg = renderJsonAssistantResponse({
        chatWindow: this.chatWindow,
        language,
        response: result.data,
        userQuestion,
        suggestions,
        handoffActions,
        onSend: (question) => this.handleSend(question),
        onHandoffAction: (action) => this.handleHandoffAction(action),
        onFeedbackSubmit: (payload) => this.submitFeedback(payload),
      });
      this.messageHistory.push(msg);
      this.saveSession();
      this.chatWindow.setLoading(false);
      return;
    }

    const message = await this.streamRenderer.consume(result.response);
    if (message) {
      this.messageHistory.push(message);
      this.saveSession();
    }
    this.chatWindow.setLoading(false);
  }

  private getHandoffActions(language: ChatLanguage): HandoffAction[] {
    return buildHandoffActions(this.config.escalation, language);
  }

  private getStarterSuggestions(currentQuestion?: string): string[] {
    return getStarterSuggestions(this.config.starterQuestions, currentQuestion);
  }

  private getLastUserQuestion(): string | undefined {
    return getLastUserQuestion(this.messageHistory);
  }

  private async handleHandoffAction(action: HandoffAction) {
    if (action.kind === "share") {
      const transcript = this.buildTranscript();
      if (navigator.share) { await navigator.share({ text: transcript }); return; }
      await navigator.clipboard.writeText(transcript);
      return;
    }
    if (action.href) window.open(action.href, "_blank", "noopener,noreferrer");
  }

  private buildTranscript(): string {
    return buildConversationTranscript(this.messageHistory, this.getCurrentLanguage());
  }

  private async submitFeedback(payload: WidgetFeedbackPayload) {
    try {
      await this.apiClient.submitFeedback({
        question: payload.question || "", answer: payload.answer,
        sentiment: payload.sentiment, reason: payload.reason, sources: payload.sources,
      });
    } catch { /* non-critical */ }
  }

  private saveSession() {
    this.sessionStore.save({ messages: this.messageHistory, welcomed: this.hasShownWelcomeMessage });
  }

  private restoreSession() {
    const session = this.sessionStore.restore();
    if (!session) return;
    this.hasShownWelcomeMessage = session.welcomed;
    this.messageHistory = session.messages;
    restoreSessionMessages({
      messages: session.messages,
      preferredLanguage: this.config.preferredLanguage,
      chatWindow: this.chatWindow,
      onSend: (question) => this.handleSend(question),
      onHandoffAction: (action) => this.handleHandoffAction(action),
      onFeedbackSubmit: (payload) => this.submitFeedback(payload),
    });
  }

  private getCurrentLanguage(): ChatLanguage {
    return getCurrentConversationLanguage(this.messageHistory, this.config.preferredLanguage);
  }

  destroy() {
    this.sessionStore.clear();
    this.container.destroy();
  }
}
