import type { ThemeConfig } from "../types";
import { DEFAULT_THEME } from "./defaults";

export function resolveTheme(userTheme?: ThemeConfig): Required<ThemeConfig> {
  if (!userTheme) return { ...DEFAULT_THEME };
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(userTheme)) {
    if (value !== undefined) cleaned[key] = value;
  }
  return { ...DEFAULT_THEME, ...cleaned };
}

export function applyTheme(host: HTMLElement, theme: Required<ThemeConfig>) {
  host.style.setProperty("--zm-primary", theme.primaryColor);
  host.style.setProperty("--zm-primary-hover", darken(theme.primaryColor, 12));
  host.style.setProperty("--zm-primary-light", lighten(theme.primaryColor, 85));
  host.style.setProperty("--zm-text", theme.textColor);
  host.style.setProperty("--zm-text-muted", "#71717a");
  host.style.setProperty("--zm-bg", theme.backgroundColor);
  host.style.setProperty("--zm-bg-secondary", "#f4f4f5");
  host.style.setProperty("--zm-bg-elevated", "#ffffff");
  host.style.setProperty("--zm-border", "#e4e4e7");
  host.style.setProperty("--zm-border-subtle", "#f4f4f5");
  host.style.setProperty("--zm-radius", `${theme.borderRadius}px`);
  host.style.setProperty("--zm-radius-sm", `${Math.max(8, theme.borderRadius - 8)}px`);
  host.style.setProperty("--zm-font", theme.fontFamily);
  host.style.setProperty("--zm-bubble-size", `${theme.bubbleSize}px`);
  host.style.setProperty("--zm-window-width", `${theme.windowWidth}px`);
  host.style.setProperty("--zm-window-height", `${theme.windowHeight}px`);
  host.style.setProperty("--zm-shadow", "0 20px 60px -12px rgba(0, 0, 0, 0.18), 0 8px 20px -8px rgba(0, 0, 0, 0.1)");
  host.style.setProperty("--zm-shadow-sm", "0 4px 16px rgba(0, 0, 0, 0.08)");
  host.style.setProperty(
    "--zm-gradient",
    `linear-gradient(135deg, ${theme.primaryColor} 0%, ${darken(theme.primaryColor, 18)} 100%)`
  );
}

function darken(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (num >> 16) - Math.round(2.55 * percent));
  const g = Math.max(0, ((num >> 8) & 0x00ff) - Math.round(2.55 * percent));
  const b = Math.max(0, (num & 0x0000ff) - Math.round(2.55 * percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function lighten(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, (num >> 16) + Math.round(2.55 * percent));
  const g = Math.min(255, ((num >> 8) & 0x00ff) + Math.round(2.55 * percent));
  const b = Math.min(255, (num & 0x0000ff) + Math.round(2.55 * percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
