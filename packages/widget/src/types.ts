import type {
  ChatConfidence,
  ChatLanguage,
  FeedbackPayload,
  HandoffAction,
  SourceCard,
  TenantBootstrap,
  TenantEscalation,
} from "@chattr/shared";

export interface ThemeConfig {
  primaryColor?: string;
  textColor?: string;
  backgroundColor?: string;
  position?: "bottom-right" | "bottom-left";
  title?: string;
  subtitle?: string;
  avatarUrl?: string;
  bubbleSize?: number;
  windowWidth?: number;
  windowHeight?: number;
  borderRadius?: number;
  fontFamily?: string;
}

export type EscalationConfig = TenantEscalation;

export interface WidgetCopy {
  bubbleAriaLabel: string;
  closeNudgeAriaLabel: string;
  closeChatAriaLabel: string;
  inputPlaceholder: string;
  sendMessageAriaLabel: string;
  retryLabel: string;
  nextStepLabel: string;
  directActionLabel: string;
  sourcesLabel: string;
  moreSourcesLabel: (count: number) => string;
  fewerSourcesLabel: string;
  feedbackPromptLabel: string;
  feedbackThanksLabel: string;
  feedbackPositiveLabel: string;
  feedbackNegativeLabel: string;
  feedbackReasons: string[];
  errorMessage: string;
  defaultWelcomeMessage: string;
  subtitle: string;
  bubbleMessage: string;
  langSwitchAriaLabel: string;
  avatarAlt: string;
}

export interface WidgetScriptConfig {
  serverUrl: string;
  theme?: ThemeConfig;
  context?: string;
  tenantId?: string;
  bubbleMessage?: string;
  bubbleDelay?: number;
  welcomeMessage?: string;
  starterQuestions?: string[];
  escalation?: EscalationConfig;
  sessionKey?: string;
  preferredLanguage: ChatLanguage;
  showLanguageSwitcher?: boolean;
}

export interface WidgetConfig {
  serverUrl: string;
  theme?: ThemeConfig;
  context?: string;
  tenantId?: string;
  bubbleMessage?: string;
  bubbleDelay?: number;
  welcomeMessage?: string;
  starterQuestions?: string[];
  escalation?: EscalationConfig;
  sessionKey?: string;
  preferredLanguage: ChatLanguage;
  showLanguageSwitcher?: boolean;
  tenantBootstrap?: TenantBootstrap | null;
}

export interface WidgetSessionData {
  messages: WidgetHistoryMessage[];
  welcomed: boolean;
  language?: ChatLanguage;
}

export interface WidgetMessageMeta {
  sources?: SourceCard[];
  suggestions?: string[];
  handoffActions?: HandoffAction[];
  feedbackEnabled?: boolean;
  feedbackQuestion?: string;
  confidence?: ChatConfidence;
  language?: ChatLanguage;
}

export interface WidgetHistoryMessage extends WidgetMessageMeta {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface WidgetFeedbackPayload extends FeedbackPayload {
  sources: SourceCard[];
}
