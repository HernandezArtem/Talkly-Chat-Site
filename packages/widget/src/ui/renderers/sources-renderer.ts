import type { SourceCard } from "@talkly/shared";
import type { WidgetCopy } from "../../types";

export class SourcesRenderer {
  private expanded = false;

  render(sources: SourceCard[], copy: WidgetCopy, onToggle: () => void): HTMLElement {
    const section = document.createElement("div");
    section.className = "zm-source-list";
    section.setAttribute("role", "list");
    section.setAttribute("aria-label", copy.sourcesLabel);

    const label = document.createElement("span");
    label.className = "zm-meta-label";
    label.textContent = copy.sourcesLabel;
    section.appendChild(label);

    const visibleSources = this.expanded ? sources : sources.slice(0, 2);

    for (const source of visibleSources) {
      const link = document.createElement("a");
      link.className = "zm-source-card";
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      const title = document.createElement("strong");
      title.textContent = source.title;
      link.appendChild(title);

      const url = document.createElement("span");
      url.textContent = this.formatUrl(source.url);
      url.title = source.url;
      link.appendChild(url);

      section.appendChild(link);
    }

    if (sources.length > 2) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "zm-source-toggle";
      toggle.textContent = this.expanded
        ? copy.fewerSourcesLabel
        : copy.moreSourcesLabel(sources.length - 2);
      toggle.addEventListener("click", () => {
        this.expanded = !this.expanded;
        onToggle();
      });
      section.appendChild(toggle);
    }

    return section;
  }

  private formatUrl(url: string): string {
    try {
      const parsed = new URL(url);
      const path = parsed.pathname.replace(/\/$/, "");
      if (!path || path === "") return parsed.hostname;

      const segments = path.split("/").filter(Boolean);
      const compactPath = segments.length > 2
        ? `/${segments.slice(0, 2).join("/")}/...`
        : path;

      return `${parsed.hostname}${compactPath}`;
    } catch {
      return url;
    }
  }
}
