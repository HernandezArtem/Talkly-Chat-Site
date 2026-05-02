const SVG_NS = "http://www.w3.org/2000/svg";

function svg(width: number, height: number, children: SVGElement[]): SVGSVGElement {
  const el = document.createElementNS(SVG_NS, "svg");
  el.setAttribute("width", String(width));
  el.setAttribute("height", String(height));
  el.setAttribute("viewBox", "0 0 24 24");
  el.setAttribute("fill", "none");
  el.setAttribute("stroke", "currentColor");
  el.setAttribute("stroke-width", "2");
  el.setAttribute("stroke-linecap", "round");
  el.setAttribute("stroke-linejoin", "round");
  for (const child of children) el.appendChild(child);
  return el;
}

function el(tag: string, attrs: Record<string, string>): SVGElement {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

export function createChatIcon(): SVGSVGElement {
  return svg(24, 24, [
    el("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }),
  ]);
}

export function createCloseIcon(): SVGSVGElement {
  return svg(24, 24, [
    el("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
    el("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
  ]);
}

export function createSendIcon(): SVGSVGElement {
  return svg(20, 20, [
    el("line", { x1: "22", y1: "2", x2: "11", y2: "13" }),
    el("polygon", { points: "22 2 15 22 11 13 2 9 22 2" }),
  ]);
}

export function createBotIcon(): SVGSVGElement {
  return svg(20, 20, [
    el("rect", { x: "3", y: "11", width: "18", height: "10", rx: "2" }),
    el("circle", { cx: "12", cy: "5", r: "2" }),
    el("path", { d: "M12 7v4" }),
    el("line", { x1: "8", y1: "16", x2: "8", y2: "16" }),
    el("line", { x1: "16", y1: "16", x2: "16", y2: "16" }),
  ]);
}

/** Replace an element's children with a fresh SVG icon. */
export function setIcon(el: HTMLElement, iconFactory: () => SVGSVGElement) {
  while (el.firstChild) el.removeChild(el.firstChild);
  el.appendChild(iconFactory());
}
