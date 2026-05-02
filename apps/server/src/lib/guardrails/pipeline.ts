import type { ChatLanguage } from "@chattr/shared";
import type { GuardrailsConfig, GuardrailResult } from "./types";
import { sanitizeInput, truncateHistory } from "./input";
import { detectPromptInjection } from "./input";
import { checkRedirects, checkForbiddenTopics } from "./input";
import { checkRateLimit } from "./input";
import { filterOutput, redactOutput } from "./output";
import { detectSystemPromptLeak } from "./output";

export interface InputCheckResult {
  allowed: boolean;
  reason?: string;
  cannedResponse?: string;
  sanitizedMessage?: string;
  sanitizedHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

/**
 * Run all input guardrails in sequence. Fails fast on first block.
 */
export function runInputGuardrails(opts: {
  userMessage: string;
  messageHistory: Array<{ role: "user" | "assistant"; content: string }>;
  clientKey: string;
  config: GuardrailsConfig;
  language: ChatLanguage;
}): InputCheckResult {
  const { userMessage, messageHistory, clientKey, config, language } = opts;

  const rateResult = checkRateLimit(clientKey, config, language);
  if (!rateResult.allowed) return rateResult;

  const sanitizedMessage = sanitizeInput(userMessage, config);

  if (sanitizedMessage.length === 0) {
    return {
      allowed: false,
      reason: "Empty message after sanitization",
      cannedResponse: language === "nl"
        ? "Het lijkt erop dat uw bericht leeg was. Kunt u het opnieuw proberen?"
        : "It looks like your message was empty. Could you try again?",
    };
  }

  if (config.inputGuardrails.promptInjectionDetection !== false) {
    const injectionResult = detectPromptInjection(sanitizedMessage, language);
    if (!injectionResult.allowed) {
      console.warn(`[Chattr] Injection blocked: ${injectionResult.reason}`);
      return injectionResult;
    }
  }

  const redirectResult = checkRedirects(sanitizedMessage, config);
  if (!redirectResult.allowed) return redirectResult;

  const forbiddenResult = checkForbiddenTopics(sanitizedMessage, config, language);
  if (!forbiddenResult.allowed) return forbiddenResult;

  const sanitizedHistory = truncateHistory(messageHistory, config);

  return { allowed: true, sanitizedMessage, sanitizedHistory };
}

/**
 * Run output guardrails on the full generated text.
 */
export function runOutputGuardrails(opts: {
  generatedText: string;
  systemPrompt: string;
  config: GuardrailsConfig;
  language: ChatLanguage;
}): GuardrailResult & { redactedText?: string } {
  const { generatedText, systemPrompt, config, language } = opts;

  if (config.outputGuardrails.systemPromptLeakDetection !== false) {
    const leakResult = detectSystemPromptLeak(generatedText, systemPrompt);
    if (!leakResult.allowed) {
      console.warn(`[Chattr] Prompt leak blocked: ${leakResult.reason}`);
      return {
        allowed: false,
        reason: leakResult.reason,
        cannedResponse: language === "nl"
          ? "Sorry, ik kan die informatie niet geven. Waarmee kan ik u verder helpen?"
          : "I'm sorry, I can't provide that information. How else can I help you?",
      };
    }
  }

  if (config.outputGuardrails.contentFiltering !== false) {
    const filterResult = filterOutput(generatedText, config);
    if (!filterResult.allowed) {
      console.warn(`[Chattr] Output filtered: ${filterResult.reason}`);
      const redactedText = redactOutput(generatedText, config);
      return { allowed: true, redactedText, reason: filterResult.reason };
    }
  }

  return { allowed: true };
}
