import type { ChatLanguage } from "@talkly/shared";
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
      cannedResponse: language === "ru"
        ? "Вы отправляете сообщения слишком быстро. Подождите немного и попробуйте снова."
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

  // ── Russian equivalents ──
  {
    pattern: /игнорируй\s+(все\s+)?(предыдущие|ранние|выше|предшествующие)\s+(инструкции?|правила?|указания?|директивы?)/i,
    weight: 0.9,
    label: "instruction_override",
  },
  {
    pattern: /забудь\s+(всё|все|свои|твои)\s+(инструкции?|правила?|указания?)/i,
    weight: 0.85,
    label: "instruction_override",
  },
  {
    pattern: /(?:покажи|выведи|повтори|что\s+(?:это|такое))\s+(?:твои?|ваши?|системн\w*\s*)?(?:промпт|инструкции?|правила?|указания?)/i,
    weight: 0.7,
    label: "prompt_extraction",
  },
  {
    pattern: /(?:что|покажи)\s+(?:были|есть)\s+(?:твои?|ваши?|исходн\w*)\s+(?:инструкции?|промпт)/i,
    weight: 0.75,
    label: "prompt_extraction",
  },
  {
    pattern: /(?:ты\s+теперь|веди\s+себя\s+как|представь\s+что\s+ты|с\s+этого\s+момента\s+ты)\s+(?!полезн\w*|поддержк\w*|помощник)/i,
    weight: 0.7,
    label: "role_hijack",
  },
  {
    pattern: /(?:включи|активируй|перейди\s+в)\s+(?:режим\s+)?(?:разработчик\w*|отладк\w*|админ\w*|без\s+ограничений)/i,
    weight: 0.95,
    label: "role_hijack",
  },
  {
    pattern: /(?:давай\s+сыграем|в\s+гипотетическ\w*\s+(?:сценари\w*|ситуаци\w*)|представь\s+что\s+у\s+тебя\s+нет\s+(?:правил|ограничений))/i,
    weight: 0.5,
    label: "hypothetical_bypass",
  },
  {
    pattern: /\b(?:без\s+ограничений|без\s+правил|делай\s+всё)\b/i,
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
      cannedResponse: language === "ru"
        ? "Я не могу изменить свои инструкции или роль. Чем могу помочь с вашим вопросом?"
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
        cannedResponse: language === "ru"
          ? `Я не могу обсуждать ${topic}. Могу ли я помочь с чем-то другим?`
          : `I'm not able to discuss ${topic}. Is there something else I can help you with?`,
      };
    }
  }

  return { allowed: true };
}
