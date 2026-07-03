import { createChatIcon, createCloseIcon, setIcon } from "./icons";
import type { WidgetCopy } from "../types";

export class ChatBubble {
  public el: HTMLButtonElement;
  private nudgeEl: HTMLElement | null = null;

  constructor(
    private position: "bottom-right" | "bottom-left",
    private copy: WidgetCopy,
    private onToggle: () => void
  ) {
    this.el = document.createElement("button");
    this.el.className = `chattr-bubble ${position}`;
    setIcon(this.el, createChatIcon);
    this.el.setAttribute("aria-label", copy.bubbleAriaLabel);
    this.el.addEventListener("click", () => {
      this.onToggle();
    });
  }

  setOpen(open: boolean) {
    setIcon(this.el, open ? createCloseIcon : createChatIcon);
  }

  showNudge(message: string, onOpen: () => void) {
    if (this.nudgeEl) return;

    this.nudgeEl = document.createElement("div");
    this.nudgeEl.className = `zm-nudge ${this.position}`;

    const text = document.createElement("p");
    text.textContent = message;
    this.nudgeEl.appendChild(text);

    const closeBtn = document.createElement("button");
    closeBtn.className = "zm-nudge-close";
    closeBtn.setAttribute("aria-label", this.copy.closeNudgeAriaLabel);
    closeBtn.textContent = "\u00d7";
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.hideNudge();
    });
    this.nudgeEl.appendChild(closeBtn);

    this.nudgeEl.addEventListener("click", () => {
      this.hideNudge();
      onOpen();
    });

    // Insert before bubble so it renders underneath
    this.el.parentNode?.insertBefore(this.nudgeEl, this.el);
  }

  hideNudge() {
    if (this.nudgeEl) {
      this.nudgeEl.remove();
      this.nudgeEl = null;
    }
  }

  updateCopy(copy: WidgetCopy) {
    this.copy = copy;
    this.el.setAttribute("aria-label", copy.bubbleAriaLabel);
    if (this.nudgeEl) {
      const closeBtn = this.nudgeEl.querySelector(".zm-nudge-close");
      if (closeBtn) closeBtn.setAttribute("aria-label", copy.closeNudgeAriaLabel);
    }
  }

  updateNudgeMessage(message: string) {
    if (!this.nudgeEl) return;
    const text = this.nudgeEl.querySelector("p");
    if (text) text.textContent = message;
  }

  mount(parent: ShadowRoot) {
    parent.appendChild(this.el);
  }
}
