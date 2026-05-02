import type { ChatLanguage } from "@chattr/shared";
import type { GuardrailsConfig, GuardrailResult } from "./types";

// ── Rate Limiting ──

const rateLimitStore = new Map<string, number[]>();

setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of rateLimitStore) {
    if (timestamps.length === 0 || timestamps[timestamps.length - 1] < now - 300_000) {
      rateLimitStore.delete(key);
    }
  }
}, 300_000);

export function checkRateLimit(
  key: string,
  config: GuardrailsConfig,
  language: ChatLanguage
): GuardrailResult {
  const maxCount = config.inputGuardrails.rateLimitCount ?? 20;
  const windowMs = (config.inputGuardrails.rateLimitWindowSeconds ?? 60) * 1000;
  const now = Date.now();

  let timestamps = rateLimitStore.get(key);
  if (!timestamps) {
    timestamps = [];
    rateLimitStore.set(key, timestamps);
  }

  const filtered = timestamps.filter((t) => t > now - windowMs);
  rateLimitStore.set(key, filtered);

  if (filtered.length >= maxCount) {
    return {
      allowed: false,
      reason: `Rate limit exceeded: ${maxCount} messages per ${config.inputGuardrails.rateLimitWindowSeconds ?? 60}s`,
      cannedResponse: language === "nl"
        ? "U stuurt te snel berichten. Wacht even en probeer het opnieuw."
        : "You're sending messages too quickly. Please wait a moment and try again.",
    };
  }

  filtered.push(now);
  return { allowed: true };
}

// ── Sanitization ──

export function sanitizeInput(content: string, config: GuardrailsConfig): string {
  const maxLen = config.inputGuardrails.maxMessageLength ?? 4000;

  let sanitized = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  sanitized = sanitized.replace(/\n{4,}/g, "\n\n\n");
  sanitized = sanitized.trim();

  if (sanitized.length > maxLen) {
    sanitized = sanitized.slice(0, maxLen);
  }

  return sanitized;
}

export function truncateHistory(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  config: GuardrailsConfig
): Array<{ role: "user" | "assistant"; content: string }> {
  const maxLen = config.inputGuardrails.maxConversationLength ?? 50;
  if (messages.length <= maxLen) return messages;
  return messages.slice(-maxLen);
}

// ── Prompt Injection Detection ──

const INJECTION_PATTERNS: Array<{ pattern: RegExp; weight: number; label: string }> = [
  {
    pattern: /ignore\s+(all\s+)?(previous|prior|above|earlier|preceding)\s+(instructions?|rules?|prompts?|guidelines?|directives?)/i,
    weight: 0.9,
    label: "instruction_override",
  },
  {
    pattern: /disregard\s+(all\s+)?(previous|prior|above|your)\s+(instructions?|rules?|prompts?|programming)/i,
    weight: 0.9,
    label: "instruction_override",
  },
  {
    pattern: /forget\s+(everything|all|your)\s+(you\s+)?(were\s+told|know|instructions?|rules?)/i,
    weight: 0.85,
    label: "instruction_override",
  },
  {
    pattern: /(?:show|reveal|display|print|output|repeat|tell\s+me|what\s+(?:is|are))\s+(?:your|the)\s+(?:system\s+)?(?:prompt|instructions?|rules?|guidelines?|directives?|programming)/i,
    weight: 0.7,
    label: "prompt_extraction",
  },
  {
    pattern: /(?:what|show)\s+(?:were\s+you|are\s+your)\s+(?:initial|original|first)\s+(?:instructions?|prompt)/i,
    weight: 0.75,
    label: "prompt_extraction",
  },
  {
    pattern: /(?:you\s+are\s+now|act\s+as|pretend\s+(?:to\s+be|you(?:'re|\s+are))|from\s+now\s+on\s+you\s+are|switch\s+to|become)\s+(?:a\s+)?(?!helpful|support|customer)/i,
    weight: 0.7,
    label: "role_hijack",
  },
  {
    pattern: /(?:enter|switch\s+to|enable)\s+(?:developer|debug|admin|god|unrestricted|jailbreak|DAN)\s*mode/i,
    weight: 0.95,
    label: "role_hijack",
  },
  {
    pattern: /(?:base64|rot13|hex|encode|decode|translate)\s+(?:the\s+following|this|these)/i,
    weight: 0.4,
    label: "obfuscation",
  },
  {
    pattern: /(?:---\s*\n|```\s*\n|<\/system>|<\/instructions>|\[\/SYSTEM\]|\[\/INST\])/i,
    weight: 0.6,
    label: "delimiter_injection",
  },
  {
    pattern: /\b(?:DAN|do\s+anything\s+now|jailbreak|no\s+restrictions)\b/i,
    weight: 0.85,
    label: "jailbreak_phrase",
  },
  {
    pattern: /(?:let'?s\s+play\s+a\s+game|in\s+a\s+hypothetical\s+(?:scenario|world)|imagine\s+you\s+have\s+no\s+(?:rules|restrictions|limits))/i,
    weight: 0.5,
    label: "hypothetical_bypass",
  },

  // ── Dutch equivalents ──
  {
    pattern: /negeer\s+(alle\s+)?(vorige|eerdere|bovenstaande|voorgaande)\s+(instructies?|regels?|richtlijnen?|aanwijzingen?)/i,
    weight: 0.9,
    label: "instruction_override",
  },
  {
    pattern: /vergeet\s+(alles|alle|je|uw)\s+(instructies?|regels?|opdrachten?)/i,
    weight: 0.85,
    label: "instruction_override",
  },
  {
    pattern: /(?:toon|laat\s+zien|geef|herhaal|wat\s+(?:is|zijn))\s+(?:je|jouw|uw|de)\s+(?:systeem\s*)?(?:prompt|instructies?|regels?|richtlijnen?|opdracht)/i,
    weight: 0.7,
    label: "prompt_extraction",
  },
  {
    pattern: /(?:wat|toon)\s+(?:waren|zijn)\s+(?:je|jouw|uw)\s+(?:oorspronkelijke|eerste|initi[eë]le)\s+(?:instructies?|prompt)/i,
    weight: 0.75,
    label: "prompt_extraction",
  },
  {
    pattern: /(?:je\s+bent\s+nu|doe\s+alsof\s+je|gedraag\s+je\s+als|vanaf\s+nu\s+ben\s+je|schakel\s+over\s+naar)\s+(?:een\s+)?(?!behulpzaam|support|klantenservice)/i,
    weight: 0.7,
    label: "role_hijack",
  },
  {
    pattern: /(?:schakel|activeer|ga\s+naar)\s+(?:ontwikkelaar|debug|admin|onbeperkte?|god)\s*modus/i,
    weight: 0.95,
    label: "role_hijack",
  },
  {
    pattern: /(?:laten?\s+we\s+een\s+spelletje\s+spelen|in\s+een\s+hypothetisch\s+(?:scenario|wereld)|stel\s+je\s+voor\s+(?:dat\s+je|je\s+hebt)\s+geen\s+(?:regels?|beperkingen?|grenzen?))/i,
    weight: 0.5,
    label: "hypothetical_bypass",
  },
  {
    pattern: /\b(?:geen\s+beperkingen|zonder\s+regels|alles\s+doen)\b/i,
    weight: 0.85,
    label: "jailbreak_phrase",
  },
];

const BLOCK_THRESHOLD = 0.8;

export function detectPromptInjection(
  message: string,
  language: ChatLanguage
): GuardrailResult {
  let totalScore = 0;
  const matched: string[] = [];

  for (const { pattern, weight, label } of INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      totalScore += weight;
      matched.push(label);
    }
  }

  if (totalScore >= BLOCK_THRESHOLD) {
    return {
      allowed: false,
      reason: `Prompt injection detected (score: ${totalScore.toFixed(2)}, patterns: ${matched.join(", ")})`,
      cannedResponse: language === "nl"
        ? "Ik kan mijn instructies of rol niet aanpassen. Hoe kan ik u helpen met uw echte vraag?"
        : "I'm not able to change my instructions or role. How can I help you with your actual question?",
    };
  }

  return { allowed: true };
}

// ── Topic Checks ──

export function checkRedirects(message: string, config: GuardrailsConfig): GuardrailResult {
  const redirects = config.rules.redirects;
  if (!redirects) return { allowed: true };

  const lowerMsg = message.toLowerCase();

  for (const [topic, response] of Object.entries(redirects)) {
    const topicWords = topic.toLowerCase().split(/\s+/);
    if (topicWords.every((word) => lowerMsg.includes(word))) {
      return {
        allowed: false,
        reason: `Redirect triggered for topic: "${topic}"`,
        cannedResponse: response,
      };
    }
  }

  return { allowed: true };
}

export function checkForbiddenTopics(
  message: string,
  config: GuardrailsConfig,
  language: ChatLanguage
): GuardrailResult {
  const forbidden = config.rules.forbiddenTopics;
  if (!forbidden?.length) return { allowed: true };

  const lowerMsg = message.toLowerCase();

  for (const topic of forbidden) {
    if (lowerMsg.includes(topic.toLowerCase())) {
      return {
        allowed: false,
        reason: `Forbidden topic detected: "${topic}"`,
        cannedResponse: language === "nl"
          ? `Ik kan ${topic} niet bespreken. Is er iets anders waarmee ik u kan helpen?`
          : `I'm not able to discuss ${topic}. Is there something else I can help you with?`,
      };
    }
  }

  return { allowed: true };
}
