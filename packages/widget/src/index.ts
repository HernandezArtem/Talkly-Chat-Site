import { detectChatLanguage, tenantBootstrapSchema, type ChatLanguage } from "@chattr/shared";
import type { TenantBootstrap } from "@chattr/shared";
import type { EscalationConfig, ThemeConfig, WidgetConfig, WidgetScriptConfig } from "./types";
import { Widget } from "./widget";

export interface TalklyPublicApi {
  setLanguage(language: ChatLanguage): void;
  getLanguage(): ChatLanguage;
}

declare global {
  interface Window {
    Talkly?: TalklyPublicApi;
    /** @deprecated Use Talkly */
    Chattr?: TalklyPublicApi;
  }
}

const currentScript = document.currentScript as HTMLScriptElement | null;
let widgetInstance: Widget | null = null;
const pendingLanguages: ChatLanguage[] = [];

function createPublicApi(): TalklyPublicApi {
  return {
    setLanguage(language) {
      if (widgetInstance) {
        widgetInstance.setLanguage(language);
        return;
      }
      pendingLanguages.push(language);
    },
    getLanguage() {
      return widgetInstance?.getLanguage() ?? pendingLanguages.at(-1) ?? "en";
    },
  };
}

window.Talkly = createPublicApi();
// Backward compatibility after rebrand from Chattr
window.Chattr = window.Talkly;

function findScript(): HTMLScriptElement | null {
  if (currentScript?.dataset.server) return currentScript;
  const bySrc = document.querySelector<HTMLScriptElement>("script[src*='widget.js'][data-server]");
  if (bySrc) return bySrc;
  return document.querySelector<HTMLScriptElement>("script[data-server]");
}

async function boot() {
  const script = findScript();
  if (!script) {
    console.error("[Talkly] Could not find script element with data-server attribute");
    return;
  }
  const scriptConfig = parseScriptConfig(script);
  const resolvedConfig = await resolveWidgetConfig(scriptConfig);
  widgetInstance = new Widget(resolvedConfig);

  for (const language of pendingLanguages) {
    widgetInstance.setLanguage(language);
  }
  pendingLanguages.length = 0;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => { void boot(); });
} else {
  void boot();
}

function parseScriptConfig(script: HTMLScriptElement): WidgetScriptConfig {
  const serverUrl = script.dataset.server;
  if (!serverUrl) {
    throw new Error("[Talkly] data-server attribute is required");
  }
  const tenantId = script.dataset.tenant;

  return {
    serverUrl: serverUrl.replace(/\/$/, ""),
    tenantId,
    theme: {
      primaryColor: script.dataset.themePrimary,
      textColor: script.dataset.themeText,
      backgroundColor: script.dataset.themeBg,
      position: script.dataset.themePosition as "bottom-right" | "bottom-left" | undefined,
      title: script.dataset.themeTitle,
      subtitle: script.dataset.themeSubtitle,
      avatarUrl: script.dataset.themeAvatar,
    },
    context: script.dataset.context,
    bubbleMessage: script.dataset.bubbleMessage,
    bubbleDelay: parseNumber(script.dataset.bubbleDelay),
    welcomeMessage: script.dataset.welcomeMessage,
    starterQuestions: parseStarterQuestions(script.dataset.starterQuestions),
    escalation: parseEscalation(script),
    sessionKey: script.dataset.sessionKey,
    preferredLanguage: parsePreferredLanguage(script.dataset.language, script.dataset.welcomeMessage),
    showLanguageSwitcher: parseBoolean(script.dataset.showLanguageSwitcher, true),
  };
}

async function resolveWidgetConfig(scriptConfig: WidgetScriptConfig): Promise<WidgetConfig> {
  const tenantBootstrap = await fetchTenantBootstrap(scriptConfig.serverUrl, scriptConfig.tenantId);

  return {
    serverUrl: scriptConfig.serverUrl,
    tenantId: scriptConfig.tenantId,
    theme: mergeTheme(tenantBootstrap?.widget.theme, scriptConfig.theme),
    context: scriptConfig.context,
    bubbleMessage: scriptConfig.bubbleMessage ?? tenantBootstrap?.widget.bubbleMessage,
    bubbleDelay: scriptConfig.bubbleDelay ?? tenantBootstrap?.widget.bubbleDelay,
    welcomeMessage: scriptConfig.welcomeMessage ?? tenantBootstrap?.widget.welcomeMessage,
    starterQuestions: scriptConfig.starterQuestions ?? tenantBootstrap?.widget.starterQuestions,
    escalation: mergeEscalation(tenantBootstrap?.widget.escalation, scriptConfig.escalation),
    sessionKey: scriptConfig.sessionKey
      ?? (scriptConfig.tenantId ? `chattr:${scriptConfig.tenantId}` : undefined)
      ?? (tenantBootstrap ? `chattr:${tenantBootstrap.tenantId}` : undefined),
    preferredLanguage: scriptConfig.preferredLanguage,
    showLanguageSwitcher: scriptConfig.showLanguageSwitcher,
    tenantBootstrap,
  };
}

async function fetchTenantBootstrap(serverUrl: string, tenantId?: string): Promise<TenantBootstrap | null> {
  try {
    const headers: HeadersInit = {};
    if (tenantId) {
      headers["X-Chattr-Tenant"] = tenantId;
    }

    const response = await fetch(`${serverUrl}/api/bootstrap`, {
      headers,
    });
    if (!response.ok) return null;
    const parsed = tenantBootstrapSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function parseStarterQuestions(value?: string): string[] | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) return parsed;
  } catch {
    // Fall back to delimiter-based parsing.
  }
  const parts = value.split("||").map((item) => item.trim()).filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

function parseEscalation(script: HTMLScriptElement): EscalationConfig | undefined {
  const escalationPhone = script.dataset.escalationPhone;
  const escalationUrl = script.dataset.escalationUrl;
  const escalationEmail = script.dataset.escalationEmail;
  if (!escalationPhone && !escalationUrl && !escalationEmail) return undefined;
  return { phone: escalationPhone, url: escalationUrl, email: escalationEmail };
}

function mergeEscalation(
  fallback: EscalationConfig | undefined,
  override: EscalationConfig | undefined
): EscalationConfig | undefined {
  if (!fallback && !override) return undefined;
  return { ...fallback, ...stripUndefined(override) };
}

function mergeTheme(
  fallback: Pick<ThemeConfig, "primaryColor" | "title" | "subtitle" | "avatarUrl"> | undefined,
  override: ThemeConfig | undefined
): ThemeConfig | undefined {
  if (!fallback && !override) return undefined;
  return { ...fallback, ...stripUndefined(override) };
}

function stripUndefined<T extends object>(value?: T): Partial<T> {
  if (!value) return {};
  const cleaned: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) cleaned[key] = entry;
  }
  return cleaned as Partial<T>;
}

function parseNumber(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value !== "false" && value !== "0";
}

function parsePreferredLanguage(languageValue?: string, welcomeMessage?: string) {
  if (languageValue === "ru" || languageValue === "en") return languageValue;
  if (welcomeMessage) return detectChatLanguage(welcomeMessage);
  return "en" as const;
}
