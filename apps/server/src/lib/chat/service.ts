import { createDataStreamResponse, formatDataStreamPart, streamText } from "ai";
import type { Context } from "hono";
import { buildHandoffActions, chatRequestSchema, detectChatLanguage, type ChatLanguage } from "@chattr/shared";
import { buildLowConfidenceMessage, buildFollowUpSuggestions } from "../chat-experience";
import { getClientIp } from "../client-ip";
import { getEnv } from "../env";
import {
  buildSystemPrompt,
  loadGuardrailsConfig,
  runInputGuardrails,
  runOutputGuardrails,
} from "../guardrails";
import { detectChatIntent } from "../intents";
import { appendJsonlLog, createLoggedTextField, logRuntimeEvent } from "../logging";
import { getModel } from "../providers";
import { retrieveContext } from "../rag/retrieve";
import { getDocumentCount } from "../rag/vectorstore";

function detectRequestLanguage(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  fallback: "en" | "ru" = "en"
): ChatLanguage {
  const lastUser = [...messages].reverse().find((message) => message.role === "user");
  if (!lastUser) return fallback;
  return detectChatLanguage(lastUser.content, fallback);
}

export async function handleChatRequest(c: Context) {
  const body = await c.req.json();
  const parsed = chatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const { messages, context, language: preferredLanguage } = parsed.data;
  const tenantId = c.get("tenantId");
  const tenant = c.get("tenant");
  const requestId = c.req.header("x-request-id") || crypto.randomUUID();
  const clientIp = getClientIp(c);
  const clientKey = `${tenantId}:${clientIp}`;

  c.header("X-Request-Id", requestId);

  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
  if (!lastUserMessage) {
    return c.json({ error: "No user message found" }, 400);
  }

  const hasUserMessages = messages.some((message) => message.role === "user");
  const language = hasUserMessages
    ? detectRequestLanguage(messages, preferredLanguage ?? "en")
    : (preferredLanguage ?? "en");
  const config = loadGuardrailsConfig(tenant.guardrails);

  const inputResult = runInputGuardrails({
    userMessage: lastUserMessage.content,
    messageHistory: messages.map((message) => ({ role: message.role, content: message.content })),
    clientKey,
    config,
    language,
  });

  logRequest({
    requestId,
    tenantId,
    language,
    messageCount: messages.length,
    contextProvided: Boolean(context),
    question: lastUserMessage.content,
  });

  if (!inputResult.allowed) {
    logBlockedRequest({
      requestId,
      tenantId,
      reason: inputResult.reason,
      question: lastUserMessage.content,
    });

    return c.json({
      blocked: true,
      reason: inputResult.reason,
      message: inputResult.cannedResponse,
      language,
    });
  }

  const sanitizedMessage = inputResult.sanitizedMessage!;
  const sanitizedHistory = inputResult.sanitizedHistory!;
  const intent = detectChatIntent(tenantId, sanitizedMessage);
  const retrieval = await retrieveContext(sanitizedMessage, 5, tenant.dbPath, { intent });
  const suggestions = buildFollowUpSuggestions({
    query: sanitizedMessage,
    sources: retrieval.sources,
    tenant,
    language,
    intent,
  });
  const handoffActions = buildHandoffActions(tenant.escalation, language);
  const knowledgeBaseEmpty = getDocumentCount(tenant.dbPath) === 0;

  if (retrieval.confidence === "low" && !knowledgeBaseEmpty) {
    return buildFallbackResponse(c, {
      requestId,
      tenantId,
      tenant,
      language,
      intent,
      retrieval,
      suggestions,
      handoffActions,
      question: lastUserMessage.content,
    });
  }

  const operatorPrompt = tenant.systemPrompt;
  const systemPrompt = buildSystemPrompt({
    config,
    language,
    operatorPrompt,
    pageContext: context,
    ragContext: retrieval.context,
    escalation: tenant.escalation,
  });

  const provider = getEnv("CHATTR_PROVIDER") || "openai";
  const modelId = getEnv("CHATTR_MODEL") || "gpt-4o";

  const result = streamText({
    model: getModel(),
    system: systemPrompt,
    messages: sanitizedHistory.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    maxTokens: config.outputGuardrails.maxResponseTokens ?? 2048,
    onFinish: ({ usage, finishReason }) => {
      recordUsage({
        requestId,
        tenantId,
        provider,
        model: modelId,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        finishReason,
      });
    },
  });

  return buildStreamResponse({
    result,
    requestId,
    tenantId,
    tenant,
    language,
    intent,
    retrieval,
    suggestions,
    handoffActions,
    question: lastUserMessage.content,
    systemPrompt,
    config,
  });
}

function buildFallbackResponse(
  c: Context,
  opts: {
    requestId: string;
    tenantId: string;
    tenant: Context["var"]["tenant"];
    language: "en" | "ru";
    intent: ReturnType<typeof detectChatIntent>;
    retrieval: Awaited<ReturnType<typeof retrieveContext>>;
    suggestions: string[];
    handoffActions: ReturnType<typeof buildHandoffActions>;
    question: string;
  }
) {
  const message = buildLowConfidenceMessage(opts.tenant, opts.language);

  appendAnswerLog({
    tenantId: opts.tenantId,
    question: opts.question,
    answer: message,
    confidence: opts.retrieval.confidence,
    topScore: opts.retrieval.topScore,
    sources: opts.retrieval.sources,
    fallback: true,
    intentId: opts.intent?.id,
    intentScore: opts.intent?.score,
  });

  logRuntimeEvent("info", "chat_response_fallback", {
    requestId: opts.requestId,
    tenantId: opts.tenantId,
    intentId: opts.intent?.id,
    intentScore: opts.intent?.score,
    intentSourceBoosts: opts.intent?.sourceBoosts ?? [],
    language: opts.language,
    confidence: opts.retrieval.confidence,
    topScore: opts.retrieval.topScore,
    sourceCount: opts.retrieval.sources.length,
    sourceUrls: opts.retrieval.sources.map((source) => source.url),
    suggestions: opts.suggestions,
    handoffActions: opts.handoffActions.map((action) => action.kind),
    ...createLoggedTextField("question", opts.question),
    ...createLoggedTextField("answer", message),
  });

  return c.json({
    fallback: true,
    confidence: opts.retrieval.confidence,
    message,
    language: opts.language,
    suggestions: opts.suggestions,
    handoffActions: opts.handoffActions,
  });
}

function buildStreamResponse(opts: {
  result: ReturnType<typeof streamText>;
  requestId: string;
  tenantId: string;
  tenant: Context["var"]["tenant"];
  language: "en" | "ru";
  intent: ReturnType<typeof detectChatIntent>;
  retrieval: Awaited<ReturnType<typeof retrieveContext>>;
  suggestions: string[];
  handoffActions: ReturnType<typeof buildHandoffActions>;
  question: string;
  systemPrompt: string;
  config: ReturnType<typeof loadGuardrailsConfig>;
}) {
  const shouldShowHandoffActions = opts.retrieval.confidence === "medium" || Boolean(opts.intent?.preferHandoff);

  return createDataStreamResponse({
    async execute(dataStream) {
      dataStream.writeData({
        type: "confidence",
        confidence: opts.retrieval.confidence,
      });

      if (shouldShowHandoffActions) {
        dataStream.writeData({
          type: "handoffActions",
          actions: opts.handoffActions,
        });
      }

      for (const source of opts.retrieval.sources) {
        dataStream.write(`h:${JSON.stringify(source)}\n`);
      }

      let generatedText = "";
      for await (const delta of opts.result.textStream) {
        generatedText += delta;
      }

      const outputResult = runOutputGuardrails({
        generatedText,
        systemPrompt: opts.systemPrompt,
        config: opts.config,
        language: opts.language,
      });

      if (!outputResult.allowed) {
        const blockedMessage = outputResult.cannedResponse
          || (opts.language === "ru"
            ? "Извините, что-то пошло не так. Чем ещё могу помочь?"
            : "I'm sorry, something went wrong. How else can I help you?");

        dataStream.write(formatDataStreamPart("text", blockedMessage));

        logRuntimeEvent("warn", "chat_output_blocked", {
          requestId: opts.requestId,
          tenantId: opts.tenantId,
          intentId: opts.intent?.id,
          reason: outputResult.reason,
          ...createLoggedTextField("answer", generatedText),
        });

        appendAnswerLog({
          tenantId: opts.tenantId,
          question: opts.question,
          answer: blockedMessage,
          confidence: opts.retrieval.confidence,
          topScore: opts.retrieval.topScore,
          sources: opts.retrieval.sources,
          fallback: true,
          intentId: opts.intent?.id,
          intentScore: opts.intent?.score,
        });
      } else {
        const finalText = outputResult.redactedText || generatedText;
        dataStream.write(formatDataStreamPart("text", finalText));

        appendAnswerLog({
          tenantId: opts.tenantId,
          question: opts.question,
          answer: finalText,
          confidence: opts.retrieval.confidence,
          topScore: opts.retrieval.topScore,
          sources: opts.retrieval.sources,
          fallback: false,
          intentId: opts.intent?.id,
          intentScore: opts.intent?.score,
        });

        logRuntimeEvent("info", "chat_response_completed", {
          requestId: opts.requestId,
          tenantId: opts.tenantId,
          intentId: opts.intent?.id,
          intentScore: opts.intent?.score,
          intentSourceBoosts: opts.intent?.sourceBoosts ?? [],
          language: opts.language,
          confidence: opts.retrieval.confidence,
          topScore: opts.retrieval.topScore,
          sourceCount: opts.retrieval.sources.length,
          sourceUrls: opts.retrieval.sources.map((source) => source.url),
          suggestions: opts.suggestions,
          handoffActions: shouldShowHandoffActions ? opts.handoffActions.map((action) => action.kind) : [],
          ...createLoggedTextField("question", opts.question),
          ...createLoggedTextField("answer", finalText),
        });
      }

      dataStream.writeData({
        type: "suggestions",
        suggestions: opts.suggestions,
      });
    },
  });
}

function logRequest(opts: {
  requestId: string;
  tenantId: string;
  language: "en" | "ru";
  messageCount: number;
  contextProvided: boolean;
  question: string;
}) {
  logRuntimeEvent("info", "chat_request_received", {
    requestId: opts.requestId,
    tenantId: opts.tenantId,
    language: opts.language,
    messageCount: opts.messageCount,
    contextProvided: opts.contextProvided,
    ...createLoggedTextField("question", opts.question),
  });
}

function logBlockedRequest(opts: {
  requestId: string;
  tenantId: string;
  reason?: string;
  question: string;
}) {
  logRuntimeEvent("warn", "chat_request_blocked", {
    requestId: opts.requestId,
    tenantId: opts.tenantId,
    reason: opts.reason,
    ...createLoggedTextField("question", opts.question),
  });
}

function appendAnswerLog(entry: {
  tenantId: string;
  question: string;
  answer: string;
  confidence: "low" | "medium" | "high";
  topScore: number | null;
  sources: Array<{ title: string; url: string }>;
  fallback: boolean;
  intentId?: string;
  intentScore?: number;
}) {
  appendJsonlLog("./data/answers", `${entry.tenantId}.jsonl`, {
    timestamp: new Date().toISOString(),
    ...entry,
  });
}

function recordUsage(entry: {
  requestId: string;
  tenantId: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  finishReason: string;
}) {
  appendJsonlLog("./data/usage", `${entry.tenantId}.jsonl`, {
    timestamp: new Date().toISOString(),
    ...entry,
  });

  logRuntimeEvent("info", "chat_usage_recorded", entry);
}
