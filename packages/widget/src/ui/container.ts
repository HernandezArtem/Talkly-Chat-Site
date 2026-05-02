import { styles } from "../styles";
import type { ThemeConfig } from "../types";
import { applyTheme, resolveTheme } from "../theme/engine";

export class WidgetContainer {
  public host: HTMLElement;
  public shadow: ShadowRoot;

  constructor(theme?: ThemeConfig) {
    this.host = document.createElement("div");
    this.host.id = "chattr-root";
    this.shadow = this.host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = styles;
    this.shadow.appendChild(style);

    const resolved = resolveTheme(theme);
    applyTheme(this.host, resolved);

    document.body.appendChild(this.host);
  }

  destroy() {
    this.host.remove();
  }
}
