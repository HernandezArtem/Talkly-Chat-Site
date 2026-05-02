import type { ThemeConfig } from "../types";
import { DEFAULT_THEME } from "./defaults";

export function resolveTheme(userTheme?: ThemeConfig): Required<ThemeConfig> {
  if (!userTheme) return { ...DEFAULT_THEME };
  // Strip undefined values so defaults aren't overwritten
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(userTheme)) {
    if (value !== undefined) cleaned[key] = value;
  }
  return { ...DEFAULT_THEME, ...cleaned };
}

export function applyTheme(host: HTMLElement, theme: Required<ThemeConfig>) {
  host.style.setProperty("--zm-primary", theme.primaryColor);
  host.style.setProperty("--zm-primary-hover", darken(theme.primaryColor, 15));
  host.style.setProperty("--zm-text", theme.textColor);
  host.style.setProperty("--zm-bg", theme.backgroundColor);
  host.style.setProperty("--zm-bg-secondary", "#f3f4f6");
  host.style.setProperty("--zm-border", "#e5e7eb");
  host.style.setProperty("--zm-radius", `${theme.borderRadius}px`);
  host.style.setProperty("--zm-font", theme.fontFamily);
  host.style.setProperty("--zm-bubble-size", `${theme.bubbleSize}px`);
  host.style.setProperty("--zm-window-width", `${theme.windowWidth}px`);
  host.style.setProperty("--zm-window-height", `${theme.windowHeight}px`);
}

function darken(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (num >> 16) - Math.round(2.55 * percent));
  const g = Math.max(0, ((num >> 8) & 0x00ff) - Math.round(2.55 * percent));
  const b = Math.max(0, (num & 0x0000ff) - Math.round(2.55 * percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
