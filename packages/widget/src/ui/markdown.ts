/** Lightweight markdown-to-HTML renderer for LLM output. */
export function renderMarkdown(text: string): string {
  const placeholders = new Map<string, string>();
  let placeholderIndex = 0;

  const storePlaceholder = (html: string): string => {
    const key = `__ZM_TOKEN_${placeholderIndex++}__`;
    placeholders.set(key, html);
    return key;
  };

  // Escape HTML
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks (```lang\n...\n```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
    return storePlaceholder(`<pre><code>${code.trim()}</code></pre>`);
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, (_match, code) => {
    return storePlaceholder(`<code>${code}</code>`);
  });

  // Markdown links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, url) => {
    return storePlaceholder(
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
    );
  });

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Bare URLs
  html = html.replace(
    /(^|[\s(>])((?:https?:\/\/|www\.)[^\s<)]+)(?=$|[\s<),.!?])/g,
    (_match, prefix, url) => {
      const href = url.startsWith("www.") ? `https://${url}` : url;
      return `${prefix}<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    }
  );

  // Bare phone numbers
  html = html.replace(
    /(^|[\s(>])(\+?\d[\d \t().-]{6,}\d)(?=$|[\s<),.;!?])/g,
    (_match, prefix, phone) => {
      const normalized = phone.replace(/[^\d+]/g, "");
      if (normalized.replace(/\D/g, "").length < 8) {
        return `${prefix}${phone}`;
      }
      return `${prefix}<a href="tel:${normalized}">${phone}</a>`;
    }
  );

  for (const [key, value] of placeholders) {
    html = html.replaceAll(key, value);
  }

  // Split into lines for block-level processing
  const lines = html.split("\n");
  const result: string[] = [];
  let inList = false;
  let listType: "ul" | "ol" = "ul";

  for (const line of lines) {
    const trimmed = line.trim();

    // Empty line = paragraph break. Keep lists open across blank lines so
    // numbered markdown lists do not restart at 1 between items.
    if (trimmed === "") {
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(trimmed)) {
      if (!inList || listType !== "ul") {
        if (inList) result.push(`</${listType}>`);
        result.push("<ul>");
        inList = true;
        listType = "ul";
      }
      result.push(`<li>${trimmed.replace(/^[-*]\s+/, "")}</li>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      if (!inList || listType !== "ol") {
        if (inList) result.push(`</${listType}>`);
        result.push("<ol>");
        inList = true;
        listType = "ol";
      }
      result.push(`<li>${trimmed.replace(/^\d+\.\s+/, "")}</li>`);
      continue;
    }

    // Close list if needed
    if (inList) {
      result.push(`</${listType}>`);
      inList = false;
    }

    // Wrap in paragraph (skip if it's a pre block)
    if (!trimmed.startsWith("<pre>") && !trimmed.startsWith("</pre>")) {
      result.push(`<p>${trimmed}</p>`);
    } else {
      result.push(trimmed);
    }
  }

  if (inList) {
    result.push(`</${listType}>`);
  }

  return result.join("");
}
