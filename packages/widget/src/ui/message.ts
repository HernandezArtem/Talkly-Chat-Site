import type { ChatConfidence, ChatLanguage, HandoffAction, SourceCard } from "@chattr/shared";
import { renderMarkdown } from "./markdown";
import { FeedbackRenderer } from "./renderers/feedback-renderer";
import { SourcesRenderer } from "./renderers/sources-renderer";
import { renderSuggestions, renderHandoffActions } from "./renderers/chip-group-renderer";
import type { WidgetCopy, WidgetFeedbackPayload, WidgetHistoryMessage } from "../types";
import { getWidgetCopy } from "../copy";

export interface MessageData extends WidgetHistoryMessage {
  onSuggestionSelect?: (question: string) => void;
  onFeedbackSubmit?: (payload: WidgetFeedbackPayload) => void;
  onHandoffAction?: (action: HandoffAction) => void;
}

export class MessageComponent {
  public el: HTMLElement;
  private bubbleEl: HTMLElement;
  private metaEl: HTMLElement;
  private _content: string;
  private feedbackRenderer = new FeedbackRenderer();
  private sourcesRenderer = new SourcesRenderer();

  constructor(
    public data: MessageData,
    private copy: WidgetCopy
  ) {
    this._content = data.content;

    this.el = document.createElement("div");
    this.el.className = `zm-message ${data.role}`;

    this.bubbleEl = document.createElement("div");
    this.bubbleEl.className = "zm-message-bubble";
    this.metaEl = document.createElement("div");
    this.metaEl.className = "zm-message-meta";

    this.render();

    this.el.appendChild(this.bubbleEl);
    this.el.appendChild(this.metaEl);
  }

  get content() {
    return this._content;
  }

  appendContent(text: string) {
    this._content += text;
    this.render();
  }

  setContent(text: string) {
    this._content = text;
    this.render();
  }

  setCopy(copy: WidgetCopy) {
    this.copy = copy;
    this.renderMeta();
  }

  setLanguage(language: ChatLanguage) {
    this.data.language = language;
    this.setCopy(getWidgetCopy(language));
  }

  setSources(sources: SourceCard[]) {
    this.data.sources = sources;
    this.renderMeta();
  }

  setSuggestions(
    suggestions: string[],
    onSuggestionSelect?: (question: string) => void
  ) {
    this.data.suggestions = suggestions;
    if (onSuggestionSelect) {
      this.data.onSuggestionSelect = onSuggestionSelect;
    }
    this.renderMeta();
  }

  setHandoffActions(
    actions: HandoffAction[],
    onHandoffAction?: (action: HandoffAction) => void
  ) {
    this.data.handoffActions = actions;
    if (onHandoffAction) {
      this.data.onHandoffAction = onHandoffAction;
    }
    this.renderMeta();
  }

  setFeedback(
    enabled: boolean,
    opts?: {
      question?: string;
      onSubmit?: MessageData["onFeedbackSubmit"];
    }
  ) {
    this.data.feedbackEnabled = enabled;
    if (opts?.question) {
      this.data.feedbackQuestion = opts.question;
    }
    if (opts?.onSubmit) {
      this.data.onFeedbackSubmit = opts.onSubmit;
    }
    this.renderMeta();
  }

  setConfidence(confidence: ChatConfidence) {
    this.data.confidence = confidence;
    this.renderMeta();
  }

  private render() {
    if (this.data.role === "assistant") {
      // renderMarkdown returns pre-sanitized HTML
      this.bubbleEl.innerHTML = renderMarkdown(this._content); // eslint-disable-line no-unsanitized/property
    } else {
      this.bubbleEl.textContent = this._content;
    }

    this.renderMeta();
  }

  private renderMeta() {
    this.metaEl.replaceChildren();

    if (this.data.role !== "assistant") {
      return;
    }

    const fragments: HTMLElement[] = [];

    if (this.data.suggestions?.length && this.data.onSuggestionSelect) {
      fragments.push(
        renderSuggestions(this.data.suggestions, this.copy, this.data.onSuggestionSelect)
      );
    }

    if (this.data.handoffActions?.length && this.data.onHandoffAction) {
      fragments.push(
        renderHandoffActions(this.data.handoffActions, this.copy, this.data.onHandoffAction)
      );
    }

    if (this.data.sources?.length) {
      fragments.push(
        this.sourcesRenderer.render(this.data.sources, this.copy, () => this.renderMeta())
      );
    }

    if (this.data.feedbackEnabled && this.data.onFeedbackSubmit) {
      fragments.push(
        this.feedbackRenderer.render({
          content: this._content,
          feedbackQuestion: this.data.feedbackQuestion,
          sources: this.data.sources || [],
          copy: this.copy,
          onSubmit: this.data.onFeedbackSubmit,
          onStateChange: () => this.renderMeta(),
        })
      );
    }

    for (const fragment of fragments) {
      this.metaEl.appendChild(fragment);
    }
  }
}

export class TypingIndicator {
  public el: HTMLElement;

  constructor() {
    this.el = document.createElement("div");
    this.el.className = "zm-message assistant";

    const bubble = document.createElement("div");
    bubble.className = "zm-message-bubble";

    const dots = document.createElement("div");
    dots.className = "zm-typing";
    for (let i = 0; i < 3; i++) {
      dots.appendChild(document.createElement("span"));
    }

    bubble.appendChild(dots);
    this.el.appendChild(bubble);
  }
}
