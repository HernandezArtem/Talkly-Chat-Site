import {
  chatJsonResponseSchema,
  feedbackPayloadSchema,
  type ChatJsonResponse,
  type FeedbackPayload,
} from "@chattr/shared";

export type ChatApiResult =
  | { kind: "json"; data: ChatJsonResponse }
  | { kind: "stream"; response: Response };

export class ChatApiClient {
  constructor(
    private serverUrl: string,
    private tenantId?: string
  ) {}

  async sendChat(request: { messages: Array<{ id: string; role: "user" | "assistant"; content: string }>; context?: string }): Promise<ChatApiResult> {
    const response = await fetch(`${this.serverUrl}/api/chat`, {
      method: "POST",
      headers: {
        ...this.buildHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const payload = await response.json();
      const parsed = chatJsonResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error(`Invalid JSON response: ${response.status}`);
      }

      return { kind: "json", data: parsed.data };
    }

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    return { kind: "stream", response };
  }

  async submitFeedback(payload: FeedbackPayload): Promise<void> {
    const parsed = feedbackPayloadSchema.parse(payload);

    await fetch(`${this.serverUrl}/api/feedback`, {
      method: "POST",
      headers: {
        ...this.buildHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed),
    });
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.tenantId) {
      headers["X-Chattr-Tenant"] = this.tenantId;
    }
    return headers;
  }
}
