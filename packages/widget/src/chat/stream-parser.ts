import {
  sourceCardSchema,
  streamDataPartSchema,
  type SourceCard,
  type StreamDataPart,
} from "@talkly/shared";

export type ParsedStreamEvent =
  | { kind: "text"; text: string }
  | { kind: "source"; source: SourceCard }
  | { kind: "data"; items: StreamDataPart[] };

export class ChatStreamParser {
  private buffer = "";

  push(chunk: string): ParsedStreamEvent[] {
    this.buffer += chunk;

    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || "";

    return lines.flatMap((line) => this.parseLine(line));
  }

  flush(): ParsedStreamEvent[] {
    const remainder = this.buffer.trim();
    this.buffer = "";
    return remainder ? this.parseLine(remainder) : [];
  }

  private parseLine(line: string): ParsedStreamEvent[] {
    if (!line.trim()) return [];

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) return [];

    const type = line.substring(0, colonIdx);
    const data = line.substring(colonIdx + 1);

    if (type === "0") {
      try {
        const parsed = JSON.parse(data);
        return typeof parsed === "string" ? [{ kind: "text", text: parsed }] : [];
      } catch {
        return [];
      }
    }

    if (type === "h") {
      try {
        const parsed = sourceCardSchema.safeParse(JSON.parse(data));
        return parsed.success ? [{ kind: "source", source: parsed.data }] : [];
      } catch {
        return [];
      }
    }

    if (type === "2") {
      try {
        const parsed = streamDataPartSchema.array().safeParse(JSON.parse(data));
        return parsed.success ? [{ kind: "data", items: parsed.data }] : [];
      } catch {
        return [];
      }
    }

    return [];
  }
}
