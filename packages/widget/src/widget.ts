import { buildHandoffActions, matchesLanguage, type ChatLanguage, type HandoffAction } from "@chattr/shared";

import { resolveTheme } from "./theme/engine";

import { WidgetContainer } from "./ui/container";

import { ChatBubble } from "./ui/bubble";

import { ChatWindow } from "./ui/chat-window";

import { ChatApiClient } from "./chat/api-client";

import { WidgetSessionStore } from "./chat/session-store";

import { RepeatedQuestionTracker } from "./chat/repeat-tracker";

import {

  getWidgetCopy,

  getAssistantMessageCopy,

  buildRepeatEscalationMessage,

  resolveWelcomeMessage,

  resolveSubtitle,

  resolveBubbleMessage,

} from "./copy";

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

  /** Language of UI chrome (site switcher). */

  private uiLanguage: ChatLanguage;

  private nudgeShown = false;



  constructor(private config: WidgetConfig) {

    const theme = resolveTheme(config.theme);

    this.uiLanguage = config.preferredLanguage;

    const initialCopy = getWidgetCopy(this.uiLanguage);



    this.apiClient = new ChatApiClient(config.serverUrl, config.tenantId);

    this.sessionStore = new WidgetSessionStore(config.sessionKey);



    this.container = new WidgetContainer(config.theme);

    this.bubble = new ChatBubble(theme.position, initialCopy, () => this.toggle());

    this.bubble.mount(this.container.shadow);



    this.chatWindow = new ChatWindow(

      {

        title: theme.title,

        subtitle: resolveSubtitle(this.uiLanguage, theme.subtitle),

        avatarUrl: theme.avatarUrl,

        position: theme.position,

        showLanguageSwitcher: config.showLanguageSwitcher !== false,

      },

      initialCopy,

      this.uiLanguage,

      (text) => this.handleSend(text),

      () => this.toggle(),

      (language) => this.setLanguage(language)

    );

    this.chatWindow.mount(this.container.shadow);



    this.streamRenderer = new StreamResponseRenderer({

      chatWindow: this.chatWindow,

      getUiLanguage: () => this.getUiLanguage(),

      getResponseLanguage: () => this.getResponseLanguage(),

      getUserQuestion: () => this.getLastUserQuestion(),

      getStarterSuggestions: (currentQuestion, language) =>

        this.getStarterSuggestions(currentQuestion, language ?? this.getResponseLanguage()),

      getHandoffActions: (language) => this.getHandoffActions(language),

      onSend: (question) => this.handleSend(question),

      onHandoffAction: (action) => this.handleHandoffAction(action),

      onFeedbackSubmit: (payload) => this.submitFeedback(payload),

    });



    this.restoreSession();



    const bubbleMessage = resolveBubbleMessage(this.uiLanguage, config.bubbleMessage);

    if (bubbleMessage) {

      const delay = config.bubbleDelay ?? 5000;

      setTimeout(() => {

        if (!this.isOpen) {

          this.bubble.showNudge(bubbleMessage, () => this.toggle());

          this.nudgeShown = true;

        }

      }, delay);

    }

  }



  /** Site / embed language — controls labels, placeholders, welcome. */

  setLanguage(language: ChatLanguage) {

    this.uiLanguage = language;

    this.config.preferredLanguage = language;

    this.applyUiLanguage(language);

    this.saveSession();

    this.emitLanguageChange(language);

  }



  getLanguage(): ChatLanguage {

    return this.getUiLanguage();

  }



  private emitLanguageChange(language: ChatLanguage) {

    window.dispatchEvent(new CustomEvent("chattr:languagechange", { detail: { language } }));

  }



  private getUiLanguage(): ChatLanguage {

    return this.uiLanguage;

  }



  /** Language inferred from what the user actually writes. */

  private getResponseLanguage(): ChatLanguage {

    return getCurrentConversationLanguage(this.messageHistory, this.uiLanguage);

  }



  private applyUiLanguage(language: ChatLanguage) {

    const copy = getWidgetCopy(language);

    const theme = resolveTheme(this.config.theme);



    this.chatWindow.setActiveLanguage(language);

    this.chatWindow.updateCopy(copy);

    this.chatWindow.setSubtitle(resolveSubtitle(language, theme.subtitle));

    this.bubble.updateCopy(copy);



    if (this.nudgeShown) {

      this.bubble.updateNudgeMessage(resolveBubbleMessage(language, this.config.bubbleMessage));

    }



    if (this.messageHistory.length > 0) {

      this.rerenderWithUiLanguage(language);

    } else {

      this.refreshWelcomeForUiLanguage(language);

    }

  }



  private rerenderWithUiLanguage(uiLanguage: ChatLanguage) {

    const hasUserMessages = this.messageHistory.some((message) => message.role === "user");



    if (!hasUserMessages) {

      const welcome = resolveWelcomeMessage(uiLanguage, this.config.welcomeMessage);

      for (const message of this.messageHistory) {

        if (message.role === "assistant") {

          message.content = welcome;

          message.language = uiLanguage;

          message.suggestions = this.getStarterSuggestions(undefined, uiLanguage);

          message.handoffActions = this.getHandoffActions(uiLanguage);

        }

      }

    }



    this.chatWindow.clearMessages();

    restoreSessionMessages({

      messages: this.messageHistory,

      uiLanguage,

      chatWindow: this.chatWindow,

      onSend: (question) => this.handleSend(question),

      onHandoffAction: (action) => this.handleHandoffAction(action),

      onFeedbackSubmit: (payload) => this.submitFeedback(payload),

    });

    this.saveSession();

  }



  private refreshWelcomeForUiLanguage(language: ChatLanguage) {

    const hasUserMessages = this.messageHistory.some((message) => message.role === "user");

    if (hasUserMessages) return;



    const welcome = resolveWelcomeMessage(language, this.config.welcomeMessage);

    const welcomeComponent = this.chatWindow.getFirstAssistantMessage();



    if (welcomeComponent) {

      welcomeComponent.setContent(welcome);

      welcomeComponent.setLanguage(language);

      const suggestions = this.getStarterSuggestions(undefined, language);

      if (suggestions.length) {

        welcomeComponent.setSuggestions(suggestions, (question) => this.handleSend(question));

      } else {

        welcomeComponent.setSuggestions([], () => {});

      }

      this.messageHistory = [{

        id: welcomeComponent.data.id,

        role: "assistant",

        content: welcome,

        language,

        suggestions,

      }];

      this.saveSession();

      return;

    }



    if (this.isOpen && !this.hasShownWelcomeMessage) {

      this.showWelcomeMessage();

    }

  }



  private toggle() {

    this.isOpen = !this.isOpen;

    this.bubble.setOpen(this.isOpen);

    if (this.isOpen) {

      this.bubble.hideNudge();

      this.nudgeShown = false;

      this.chatWindow.open();

      this.showWelcomeMessage();

    } else {

      this.chatWindow.close();

      this.bubble.el.focus();

    }

  }



  private showWelcomeMessage() {

    if (this.hasShownWelcomeMessage) return;

    if (!this.config.welcomeMessage && !this.config.starterQuestions?.length) return;



    const language = this.getUiLanguage();

    const copy = getWidgetCopy(language);

    const content = resolveWelcomeMessage(language, this.config.welcomeMessage);

    const welcomeMessage: WidgetHistoryMessage = {

      id: crypto.randomUUID(),

      role: "assistant",

      content,

      language,

    };

    const welcomeComponent = this.chatWindow.addMessage(welcomeMessage, copy);

    const suggestions = this.getStarterSuggestions(undefined, language);

    if (suggestions.length) {

      welcomeComponent.setSuggestions(suggestions, (question) => this.handleSend(question));

      welcomeMessage.suggestions = suggestions;

    }

    this.messageHistory.push(welcomeMessage);

    this.chatWindow.scrollMessageToTop(welcomeComponent);

    this.hasShownWelcomeMessage = true;

    this.saveSession();

  }



  private async handleSend(text: string) {

    const uiCopy = getWidgetCopy(this.getUiLanguage());

    const userMsg: WidgetHistoryMessage = { id: crypto.randomUUID(), role: "user", content: text };

    this.messageHistory.push(userMsg);



    const responseLanguage = this.getResponseLanguage();



    this.chatWindow.addMessage(userMsg, uiCopy);



    if (this.repeatTracker.shouldEscalate(text) && hasRepeatEscalation(this.config.escalation)) {

      const handoffActions = this.getHandoffActions(responseLanguage);

      const escalationMsg: WidgetHistoryMessage = {

        id: crypto.randomUUID(),

        role: "assistant",

        content: buildRepeatEscalationMessage(responseLanguage, this.config.escalation),

        handoffActions,

        suggestions: this.getStarterSuggestions(text, responseLanguage),

        language: responseLanguage,

      };

      const component = this.chatWindow.addMessage(escalationMsg, getAssistantMessageCopy(responseLanguage));

      if (handoffActions.length) component.setHandoffActions(handoffActions, (action) => this.handleHandoffAction(action));

      if (escalationMsg.suggestions?.length) {

        component.setSuggestions(escalationMsg.suggestions, (question) => this.handleSend(question));

      }

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

      this.chatWindow.hideTyping();

      this.chatWindow.setLoading(false);

      this.chatWindow.showError(uiCopy.errorMessage, () => this.handleSend(text));

    }

  }



  private async streamResponse() {

    const responseLanguage = this.getResponseLanguage();



    const result = await this.apiClient.sendChat({

      messages: this.messageHistory.map(({ id, role, content }) => ({ id, role, content })),

      context: this.config.context,

      language: responseLanguage,

    });



    if (result.kind === "json") {

      this.chatWindow.hideTyping();

      const resolvedResponseLanguage = result.data.language ?? responseLanguage;

      const userQuestion = this.getLastUserQuestion();

      const suggestions = (result.data.suggestions?.length

        ? result.data.suggestions

        : this.getStarterSuggestions(userQuestion, resolvedResponseLanguage)

      ).filter((suggestion) => matchesLanguage(suggestion, resolvedResponseLanguage));

      const handoffActions = this.getHandoffActions(resolvedResponseLanguage);



      const msg = renderJsonAssistantResponse({

        chatWindow: this.chatWindow,

        uiLanguage: this.getUiLanguage(),

        responseLanguage: resolvedResponseLanguage,

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



  private getStarterSuggestions(currentQuestion?: string, language = this.getResponseLanguage()): string[] {

    return getStarterSuggestions(this.config.starterQuestions, currentQuestion, language);

  }



  private getLastUserQuestion(): string | undefined {

    return getLastUserQuestion(this.messageHistory);

  }



  private async handleHandoffAction(action: HandoffAction) {

    if (action.kind === "share") {

      const transcript = this.buildTranscript();

      if (navigator.share) {

        await navigator.share({ text: transcript });

        return;

      }

      await navigator.clipboard.writeText(transcript);

      return;

    }

    if (action.href) window.open(action.href, "_blank", "noopener,noreferrer");

  }



  private buildTranscript(): string {

    return buildConversationTranscript(this.messageHistory, this.getResponseLanguage());

  }



  private async submitFeedback(payload: WidgetFeedbackPayload) {

    try {

      await this.apiClient.submitFeedback({

        question: payload.question || "",

        answer: payload.answer,

        sentiment: payload.sentiment,

        reason: payload.reason,

        sources: payload.sources,

      });

    } catch {

      // non-critical

    }

  }



  private saveSession() {

    this.sessionStore.save({

      messages: this.messageHistory,

      welcomed: this.hasShownWelcomeMessage,

      language: this.uiLanguage,

    });

  }



  private restoreSession() {

    const session = this.sessionStore.restore();

    if (!session) return;



    this.hasShownWelcomeMessage = session.welcomed;

    this.messageHistory = session.messages;



    if (session.language) {

      this.uiLanguage = session.language;

      this.config.preferredLanguage = session.language;

      this.applyUiLanguageChrome(session.language);

    }



    restoreSessionMessages({

      messages: session.messages,

      uiLanguage: this.uiLanguage,

      chatWindow: this.chatWindow,

      onSend: (question) => this.handleSend(question),

      onHandoffAction: (action) => this.handleHandoffAction(action),

      onFeedbackSubmit: (payload) => this.submitFeedback(payload),

    });

  }



  private applyUiLanguageChrome(language: ChatLanguage) {

    const copy = getWidgetCopy(language);

    const theme = resolveTheme(this.config.theme);



    this.chatWindow.setActiveLanguage(language);

    this.chatWindow.updateCopy(copy);

    this.chatWindow.setSubtitle(resolveSubtitle(language, theme.subtitle));

    this.bubble.updateCopy(copy);

  }



  destroy() {

    this.sessionStore.clear();

    this.container.destroy();

  }

}


