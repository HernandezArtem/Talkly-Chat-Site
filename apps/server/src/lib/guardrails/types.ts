import { z } from "zod";

export interface GuardrailsConfig {
  identity: {
    /** The role of the chatbot, e.g. "support agent for Acme Corp". */
    role: string;
    /** Personality traits, e.g. "professional, concise, friendly" */
    personality?: string;
  };

  rules: {
    /** Topics the bot is allowed to discuss. If set, off-topic messages are blocked. */
    allowedTopics?: string[];
    /** Topics the bot must refuse to discuss. */
    forbiddenTopics?: string[];
    /** Regex patterns that must not appear in LLM output (e.g. SSN, credit card). */
    forbiddenOutputPatterns?: string[];
    /** Canned redirects: topic keyword -> response string. */
    redirects?: Record<string, string>;
    /** Additional custom rules injected into the system prompt. */
    customRules?: string[];
  };

  inputGuardrails: {
    /** Max characters per user message. Default: 4000 */
    maxMessageLength?: number;
    /** Max messages in conversation history sent to LLM. Default: 50 */
    maxConversationLength?: number;
    /** Enable heuristic prompt injection detection. Default: true */
    promptInjectionDetection?: boolean;
    /** Enable LLM-as-judge for prompt injection. Default: false */
    llmJudge?: boolean;
    /** Rate limit: max messages per window. Default: 20 */
    rateLimitCount?: number;
    /** Rate limit window in seconds. Default: 60 */
    rateLimitWindowSeconds?: number;
  };

  outputGuardrails: {
    /** Max tokens for LLM response. Default: 2048 */
    maxResponseTokens?: number;
    /** Detect if the LLM leaks fragments of the system prompt. Default: true */
    systemPromptLeakDetection?: boolean;
    /** Enable content filtering on output. Default: true */
    contentFiltering?: boolean;
  };
}

export interface GuardrailResult {
  allowed: boolean;
  reason?: string;
  /** If set, send this as the response instead of calling the LLM. */
  cannedResponse?: string;
}

const guardrailsConfigObject = z.object({
  identity: z.object({
    role: z.string().min(1),
    personality: z.string().optional(),
  }),
  rules: z.object({
    allowedTopics: z.array(z.string()).optional(),
    forbiddenTopics: z.array(z.string()).optional(),
    forbiddenOutputPatterns: z.array(z.string()).optional(),
    redirects: z.record(z.string(), z.string()).optional(),
    customRules: z.array(z.string()).optional(),
  }),
  inputGuardrails: z.object({
    maxMessageLength: z.number().int().positive().optional(),
    maxConversationLength: z.number().int().positive().optional(),
    promptInjectionDetection: z.boolean().optional(),
    llmJudge: z.boolean().optional(),
    rateLimitCount: z.number().int().positive().optional(),
    rateLimitWindowSeconds: z.number().int().positive().optional(),
  }),
  outputGuardrails: z.object({
    maxResponseTokens: z.number().int().positive().optional(),
    systemPromptLeakDetection: z.boolean().optional(),
    contentFiltering: z.boolean().optional(),
  }),
});

export const guardrailsConfigSchema: z.ZodType<GuardrailsConfig> = guardrailsConfigObject;
export const partialGuardrailsConfigSchema = guardrailsConfigObject.deepPartial();
export type PartialGuardrailsConfig = z.infer<typeof partialGuardrailsConfigSchema>;
