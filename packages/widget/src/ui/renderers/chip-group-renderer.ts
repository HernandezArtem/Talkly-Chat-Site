import type { HandoffAction } from "@talkly/shared";
import type { WidgetCopy } from "../../types";

export function renderSuggestions(
  suggestions: string[],
  copy: WidgetCopy,
  onSelect: (question: string) => void
): HTMLElement {
  const section = document.createElement("div");
  section.className = "zm-chip-group";
  section.setAttribute("role", "group");
  section.setAttribute("aria-label", copy.nextStepLabel);

  const label = document.createElement("span");
  label.className = "zm-meta-label";
  label.textContent = copy.nextStepLabel;
  section.appendChild(label);

  for (const suggestion of suggestions) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "zm-chip-button";
    button.textContent = suggestion;
    button.addEventListener("click", () => onSelect(suggestion));
    section.appendChild(button);
  }

  return section;
}

export function renderHandoffActions(
  actions: HandoffAction[],
  copy: WidgetCopy,
  onAction: (action: HandoffAction) => void
): HTMLElement {
  const section = document.createElement("div");
  section.className = "zm-chip-group";
  section.setAttribute("role", "group");
  section.setAttribute("aria-label", copy.directActionLabel);

  const label = document.createElement("span");
  label.className = "zm-meta-label";
  label.textContent = copy.directActionLabel;
  section.appendChild(label);

  for (const action of actions) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "zm-action-button";
    button.textContent = action.label;
    button.addEventListener("click", () => onAction(action));
    section.appendChild(button);
  }

  return section;
}
