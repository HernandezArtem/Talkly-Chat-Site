import type { GuardrailsConfig, GuardrailResult } from "./types";

// ── Content Filtering ──

export function filterOutput(text: string, config: GuardrailsConfig): GuardrailResult {
  if (!config.outputGuardrails.contentFiltering) {
    return { allowed: true };
  }

  const patterns = config.rules.forbiddenOutputPatterns;
  if (!patterns?.length) return { allowed: true };

  for (const patternStr of patterns) {
    try {
      const regex = new RegExp(patternStr, "gi");
      if (regex.test(text)) {
        return {
          allowed: false,
          reason: `Output matched forbidden pattern: ${patternStr}`,
        };
      }
    } catch {
      console.warn(`[Chattr] Invalid forbidden output pattern: ${patternStr}`);
    }
  }

  return { allowed: true };
}

export function redactOutput(text: string, config: GuardrailsConfig): string {
  const patterns = config.rules.forbiddenOutputPatterns;
  if (!patterns?.length) return text;

  let redacted = text;

  for (const patternStr of patterns) {
    try {
      const regex = new RegExp(patternStr, "gi");
      redacted = redacted.replace(regex, "[REDACTED]");
    } catch {
      // Invalid regex, skip
    }
  }

  return redacted;
}

// ── System Prompt Leak Detection ──

export function detectSystemPromptLeak(output: string, systemPrompt: string): GuardrailResult {
  const leakedSectionHeader = detectLeakedSectionHeader(output, systemPrompt);
  if (leakedSectionHeader) {
    return {
      allowed: false,
      reason: `System prompt leak detected: output contains section header "${leakedSectionHeader}"`,
    };
  }

  const fragments = extractSignificantFragments(systemPrompt);
  const outputLower = output.toLowerCase();

  for (const fragment of fragments) {
    if (outputLower.includes(fragment.toLowerCase())) {
      return {
        allowed: false,
        reason: `System prompt leak detected: output contains fragment "${fragment.slice(0, 50)}..."`,
      };
    }
  }

  return { allowed: true };
}

const GENERIC_PHRASES = new Set([
  "you are a helpful assistant",
  "answer clearly and concisely",
  "be friendly and professional",
  "if you don't know",
  "say so honestly",
  "reference information",
]);

const PROTECTED_SECTION_PREFIXES = [
  "[SYSTEM",
  "[GUARDRAIL RULES",
];

const EXCLUDED_SECTION_PREFIXES = [
  "[OPERATOR INSTRUCTIONS]",
  "[PAGE CONTEXT",
  "[REFERENCE INFORMATION",
];

const NON_LEAK_INSTRUCTION_PHRASES = [
  "use only the content below",
  "do not add, infer, or fabricate",
  "if the answer is not contained below",
  "source url",
  "always include the relevant source url",
  "respond in the same language",
  "do not provide medical advice",
  "do not generate or execute code",
];

function detectLeakedSectionHeader(output: string, systemPrompt: string): string | null {
  const outputLower = output.toLowerCase();
  for (const header of extractSectionHeaders(systemPrompt)) {
    if (outputLower.includes(header.toLowerCase())) {
      return header;
    }
  }

  return null;
}

function extractSignificantFragments(prompt: string): string[] {
  const fragments: string[] = [];
  const protectedText = extractProtectedPromptText(prompt);

  const sentences = protectedText
    .split(/[.\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const sentence of sentences) {
    if (sentence.length < 30) continue;
    if (sentence.startsWith("[")) continue;

    const lower = sentence.toLowerCase();
    let isGeneric = false;
    for (const generic of GENERIC_PHRASES) {
      if (lower.includes(generic)) {
        isGeneric = true;
        break;
      }
    }
    if (!isGeneric) {
      for (const excluded of NON_LEAK_INSTRUCTION_PHRASES) {
        if (lower.includes(excluded)) {
          isGeneric = true;
          break;
        }
      }
    }
    if (isGeneric) continue;

    fragments.push(sentence);
  }

  return fragments;
}

function extractProtectedPromptText(prompt: string): string {
  const sections = splitPromptSections(prompt);

  return sections
    .filter((section) => PROTECTED_SECTION_PREFIXES.some((prefix) => section.header.startsWith(prefix)))
    .map((section) => section.body)
    .join("\n");
}

function extractSectionHeaders(prompt: string): string[] {
  return splitPromptSections(prompt)
    .map((section) => section.header)
    .filter((header) => !EXCLUDED_SECTION_PREFIXES.some((prefix) => header.startsWith(prefix)));
}

function splitPromptSections(prompt: string): Array<{ header: string; body: string }> {
  const sections: Array<{ header: string; body: string }> = [];
  let currentHeader: string | null = null;
  let currentBody: string[] = [];

  for (const line of prompt.split("\n")) {
    const trimmed = line.trim();
    const isHeader = trimmed.startsWith("[") && trimmed.endsWith("]");

    if (isHeader) {
      if (currentHeader) {
        sections.push({
          header: currentHeader,
          body: currentBody.join("\n").trim(),
        });
      }

      currentHeader = trimmed;
      currentBody = [];
      continue;
    }

    currentBody.push(line);
  }

  if (currentHeader) {
    sections.push({
      header: currentHeader,
      body: currentBody.join("\n").trim(),
    });
  }

  return sections;
}
