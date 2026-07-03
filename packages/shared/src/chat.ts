import { z } from "zod";
import { chatLanguageSchema, type ChatLanguage } from "./language";
import type { TenantEscalation } from "./tenant";

export const chatConfidenceSchema = z.enum(["low", "medium", "high"]);
export type ChatConfidence = z.infer<typeof chatConfidenceSchema>;

export const sourceCardSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
});
export type SourceCard = z.infer<typeof sourceCardSchema>;

export const handoffActionSchema = z.object({
  kind: z.enum(["link", "tel", "share"]),
  label: z.string().min(1),
  href: z.string().optional(),
});
export type HandoffAction = z.infer<typeof handoffActionSchema>;

export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema),
  context: z.string().optional(),
  language: chatLanguageSchema.optional(),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const feedbackPayloadSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  sentiment: z.enum(["up", "down"]),
  reason: z.string().optional(),
  sources: z.array(sourceCardSchema).optional(),
});
export type FeedbackPayload = z.infer<typeof feedbackPayloadSchema>;

export const chatJsonResponseSchema = z.object({
  blocked: z.boolean().optional(),
  fallback: z.boolean().optional(),
  confidence: chatConfidenceSchema.optional(),
  reason: z.string().optional(),
  message: z.string().min(1),
  language: chatLanguageSchema.optional(),
  suggestions: z.array(z.string().min(1)).optional(),
  handoffActions: z.array(handoffActionSchema).optional(),
});
export type ChatJsonResponse = z.infer<typeof chatJsonResponseSchema>;

export const streamDataPartSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("suggestions"),
    suggestions: z.array(z.string().min(1)),
  }),
  z.object({
    type: z.literal("handoffActions"),
    actions: z.array(handoffActionSchema),
  }),
  z.object({
    type: z.literal("confidence"),
    confidence: chatConfidenceSchema,
  }),
  z.object({
    type: z.literal("retracted"),
    message: z.string().min(1),
  }),
]);
export type StreamDataPart = z.infer<typeof streamDataPartSchema>;

export function buildHandoffActions(
  escalation: TenantEscalation | undefined,
  language: ChatLanguage
): HandoffAction[] {
  const labels = language === "en"
    ? {
        call: "Call us",
        contact: "Open contact page",
        share: "Share conversation",
      }
    : {
        call: "Позвонить",
        contact: "Открыть страницу контактов",
        share: "Поделиться перепиской",
      };

  const actions: HandoffAction[] = [];

  if (escalation?.phone) {
    actions.push({
      kind: "tel",
      label: labels.call,
      href: `tel:${escalation.phone.replace(/[^\d+]/g, "")}`,
    });
  }

  if (escalation?.url) {
    actions.push({
      kind: "link",
      label: labels.contact,
      href: escalation.url,
    });
  }

  actions.push({
    kind: "share",
    label: labels.share,
  });

  return actions;
}

export { chatLanguageSchema };
