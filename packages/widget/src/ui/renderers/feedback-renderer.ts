import type { SourceCard } from "@talkly/shared";
import type { WidgetCopy, WidgetFeedbackPayload } from "../../types";

export interface FeedbackRendererOpts {
  content: string;
  feedbackQuestion?: string;
  sources: SourceCard[];
  copy: WidgetCopy;
  onSubmit: (payload: WidgetFeedbackPayload) => void;
  onStateChange: () => void;
}

export class FeedbackRenderer {
  private state: "idle" | "liked" | "disliked" | "submitted" = "idle";

  render(opts: FeedbackRendererOpts): HTMLElement {
    const feedbackQuestion = opts.feedbackQuestion ?? opts.content;
    const section = document.createElement("div");
    section.className = "zm-feedback";
    section.setAttribute("role", "group");
    section.setAttribute("aria-label", opts.copy.feedbackPromptLabel);

    const label = document.createElement("span");
    label.className = "zm-meta-label";
    label.textContent = this.state === "submitted"
      ? opts.copy.feedbackThanksLabel
      : opts.copy.feedbackPromptLabel;
    section.appendChild(label);

    if (this.state === "submitted") {
      return section;
    }

    const likeButton = document.createElement("button");
    likeButton.type = "button";
    likeButton.className = `zm-feedback-button ${this.state === "liked" ? "active" : ""}`.trim();
    likeButton.textContent = opts.copy.feedbackPositiveLabel;
    likeButton.addEventListener("click", () => {
      this.state = "submitted";
      opts.onSubmit({
        sentiment: "up",
        question: feedbackQuestion,
        answer: opts.content,
        sources: opts.sources,
      });
      opts.onStateChange();
    });
    section.appendChild(likeButton);

    const dislikeButton = document.createElement("button");
    dislikeButton.type = "button";
    dislikeButton.className = `zm-feedback-button ${this.state === "disliked" ? "active" : ""}`.trim();
    dislikeButton.textContent = opts.copy.feedbackNegativeLabel;
    dislikeButton.addEventListener("click", () => {
      this.state = this.state === "disliked" ? "submitted" : "disliked";
      if (this.state === "submitted") {
        opts.onSubmit({
          sentiment: "down",
          question: feedbackQuestion,
          answer: opts.content,
          sources: opts.sources,
        });
      }
      opts.onStateChange();
    });
    section.appendChild(dislikeButton);

    if (this.state === "disliked") {
      for (const reason of opts.copy.feedbackReasons) {
        const reasonButton = document.createElement("button");
        reasonButton.type = "button";
        reasonButton.className = "zm-chip-button";
        reasonButton.textContent = reason;
        reasonButton.addEventListener("click", () => {
          this.state = "submitted";
          opts.onSubmit({
            sentiment: "down",
            reason,
            question: feedbackQuestion,
            answer: opts.content,
            sources: opts.sources,
          });
          opts.onStateChange();
        });
        section.appendChild(reasonButton);
      }
    }

    return section;
  }
}
