import { createCloseIcon, createBotIcon, createSendIcon, setIcon } from "./icons";
import { MessageComponent, MessageData, TypingIndicator } from "./message";
import type { ChatLanguage } from "@chattr/shared";
import type { WidgetCopy } from "../types";
import { getWidgetCopy } from "../copy";

export class ChatWindow {
  public el: HTMLElement;
  private messagesEl: HTMLElement;
  private inputEl: HTMLTextAreaElement;
  private sendBtn: HTMLButtonElement;
  private subtitleEl: HTMLParagraphElement | null = null;
  private langButtons: Partial<Record<ChatLanguage, HTMLButtonElement>> = {};
  private messages: MessageComponent[] = [];
  private typingIndicator: TypingIndicator | null = null;
  private activeLanguage: ChatLanguage;

  constructor(
    private config: {
      title: string;
      subtitle: string;
      avatarUrl: string;
      position: string;
      showLanguageSwitcher: boolean;
    },
    private copy: WidgetCopy,
    initialLanguage: ChatLanguage,
    private onSend: (text: string) => void,
    private onClose: () => void,
    private onLanguageChange: (language: ChatLanguage) => void
  ) {
    this.activeLanguage = initialLanguage;

    this.el = document.createElement("div");
    this.el.className = `zm-window ${config.position}`;
    this.el.setAttribute("role", "dialog");
    this.el.setAttribute("aria-label", config.title);

    const header = document.createElement("div");
    header.className = "zm-header";

    const headerInfo = document.createElement("div");
    headerInfo.className = "zm-header-info";

    const avatar = document.createElement("div");
    avatar.className = "zm-header-avatar";
    if (config.avatarUrl) {
      const img = document.createElement("img");
      img.src = config.avatarUrl;
      img.alt = copy.avatarAlt;
      avatar.appendChild(img);
    } else {
      setIcon(avatar, createBotIcon);
    }
    headerInfo.appendChild(avatar);

    const headerText = document.createElement("div");
    headerText.className = "zm-header-text";
    const titleEl = document.createElement("h3");
    titleEl.textContent = config.title;
    headerText.appendChild(titleEl);
    if (config.subtitle) {
      this.subtitleEl = document.createElement("p");
      this.subtitleEl.textContent = config.subtitle;
      headerText.appendChild(this.subtitleEl);
    }
    headerInfo.appendChild(headerText);
    header.appendChild(headerInfo);

    const headerActions = document.createElement("div");
    headerActions.className = "zm-header-actions";

    if (config.showLanguageSwitcher) {
      const langSwitch = document.createElement("div");
      langSwitch.className = "zm-lang-switch";
      langSwitch.setAttribute("role", "group");
      langSwitch.setAttribute("aria-label", copy.langSwitchAriaLabel);

      for (const lang of ["ru", "en"] as ChatLanguage[]) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "zm-lang-btn";
        btn.dataset.lang = lang;
        btn.textContent = lang.toUpperCase();
        btn.setAttribute("aria-pressed", lang === initialLanguage ? "true" : "false");
        if (lang === initialLanguage) btn.classList.add("active");
        btn.addEventListener("click", () => {
          if (lang !== this.activeLanguage) this.onLanguageChange(lang);
        });
        this.langButtons[lang] = btn;
        langSwitch.appendChild(btn);
      }

      headerActions.appendChild(langSwitch);
    }

    const closeBtn = document.createElement("button");
    closeBtn.className = "zm-close";
    closeBtn.setAttribute("aria-label", copy.closeChatAriaLabel);
    setIcon(closeBtn, createCloseIcon);
    closeBtn.addEventListener("click", () => this.onClose());
    headerActions.appendChild(closeBtn);
    header.appendChild(headerActions);

    this.el.appendChild(header);

    this.messagesEl = document.createElement("div");
    this.messagesEl.className = "zm-messages";
    this.messagesEl.setAttribute("role", "log");
    this.messagesEl.setAttribute("aria-live", "polite");
    this.el.appendChild(this.messagesEl);

    const inputArea = document.createElement("div");
    inputArea.className = "zm-input-area";

    this.inputEl = document.createElement("textarea");
    this.inputEl.className = "zm-input";
    this.inputEl.placeholder = copy.inputPlaceholder;
    this.inputEl.rows = 1;
    this.inputEl.addEventListener("input", () => this.autoGrow());
    this.inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });
    inputArea.appendChild(this.inputEl);

    this.sendBtn = document.createElement("button");
    this.sendBtn.className = "zm-send";
    this.sendBtn.setAttribute("aria-label", copy.sendMessageAriaLabel);
    setIcon(this.sendBtn, createSendIcon);
    this.sendBtn.addEventListener("click", () => this.handleSend());
    inputArea.appendChild(this.sendBtn);

    this.el.appendChild(inputArea);

    this.el.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.onClose();
      }
    });
  }

  private autoGrow() {
    this.inputEl.style.height = "auto";
    this.inputEl.style.height = Math.min(this.inputEl.scrollHeight, 120) + "px";
  }

  private handleSend() {
    const text = this.inputEl.value.trim();
    if (!text) return;
    this.inputEl.value = "";
    this.inputEl.style.height = "auto";
    this.onSend(text);
  }

  addMessage(data: MessageData, copy = this.copy): MessageComponent {
    const msg = new MessageComponent(data, copy);
    this.messages.push(msg);
    this.messagesEl.appendChild(msg.el);
    if (data.role === "assistant") {
      this.scrollMessageToTop(msg);
    } else {
      this.scrollToBottom();
    }
    return msg;
  }

  getFirstAssistantMessage(): MessageComponent | undefined {
    return this.messages.find((message) => message.data.role === "assistant");
  }

  clearMessages() {
    for (const message of this.messages) {
      message.el.remove();
    }
    this.messages = [];
    this.hideTyping();
  }

  showTyping() {
    if (this.typingIndicator) return;
    this.typingIndicator = new TypingIndicator();
    this.messagesEl.appendChild(this.typingIndicator.el);
    this.scrollToBottom();
  }

  hideTyping() {
    if (this.typingIndicator) {
      this.typingIndicator.el.remove();
      this.typingIndicator = null;
    }
  }

  showError(message: string, onRetry?: () => void) {
    const errorEl = document.createElement("div");
    errorEl.className = "zm-error";
    errorEl.textContent = message;
    if (onRetry) {
      const retryBtn = document.createElement("button");
      retryBtn.textContent = this.copy.retryLabel;
      retryBtn.addEventListener("click", () => {
        errorEl.remove();
        onRetry();
      });
      errorEl.appendChild(retryBtn);
    }
    this.messagesEl.appendChild(errorEl);
    this.scrollToBottom();
  }

  setLoading(loading: boolean) {
    this.sendBtn.disabled = loading;
    this.inputEl.disabled = loading;
  }

  scrollToBottom() {
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  scrollMessageToTop(message: MessageComponent) {
    const top = this.getMessageTop(message) - 8;
    this.messagesEl.scrollTop = Math.max(0, top);
  }

  scrollConversationPair(question: MessageComponent, answer: MessageComponent) {
    const viewportHeight = this.messagesEl.clientHeight;
    const pairTop = this.getMessageTop(question) - 8;
    const pairBottom = this.getMessageBottom(answer) + 8;
    const pairHeight = pairBottom - pairTop;

    if (pairHeight <= viewportHeight) {
      this.messagesEl.scrollTop = Math.max(0, pairBottom - viewportHeight);
      return;
    }

    this.messagesEl.scrollTop = Math.max(0, pairTop);
  }

  private getMessageTop(message: MessageComponent): number {
    const containerRect = this.messagesEl.getBoundingClientRect();
    const messageRect = message.el.getBoundingClientRect();
    return messageRect.top - containerRect.top + this.messagesEl.scrollTop;
  }

  private getMessageBottom(message: MessageComponent): number {
    return this.getMessageTop(message) + message.el.offsetHeight;
  }

  open() {
    this.el.classList.add("open");
    this.inputEl.focus();
  }

  close() {
    this.el.classList.remove("open");
  }

  setActiveLanguage(language: ChatLanguage) {
    this.activeLanguage = language;
    for (const [lang, btn] of Object.entries(this.langButtons) as [ChatLanguage, HTMLButtonElement][]) {
      const active = lang === language;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    }
  }

  setSubtitle(subtitle: string) {
    if (!this.subtitleEl) {
      if (!subtitle) return;
      this.subtitleEl = document.createElement("p");
      const headerText = this.el.querySelector(".zm-header-text");
      headerText?.appendChild(this.subtitleEl);
    }
    this.subtitleEl.textContent = subtitle;
    this.subtitleEl.style.display = subtitle ? "" : "none";
  }

  updateCopy(copy: WidgetCopy) {
    this.copy = copy;
    this.inputEl.placeholder = copy.inputPlaceholder;
    this.sendBtn.setAttribute("aria-label", copy.sendMessageAriaLabel);
    const closeBtn = this.el.querySelector(".zm-close");
    if (closeBtn) closeBtn.setAttribute("aria-label", copy.closeChatAriaLabel);
    const langSwitch = this.el.querySelector(".zm-lang-switch");
    if (langSwitch) langSwitch.setAttribute("aria-label", copy.langSwitchAriaLabel);
    for (const msg of this.messages) {
      if (msg.data.role === "assistant" && msg.data.language) {
        msg.setCopy(getWidgetCopy(msg.data.language));
      }
    }
  }

  mount(parent: ShadowRoot) {
    parent.appendChild(this.el);
  }
}
