import { mkdirSync } from "node:fs";
import { appendFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getEnv } from "./env";
import { resolveFromServerRoot } from "./paths";

const ensuredDirs = new Set<string>();

export function appendJsonlLog(
  relativeDir: string,
  fileName: string,
  entry: Record<string, unknown>
) {
  const dir = resolveFromServerRoot(relativeDir);
  if (!ensuredDirs.has(dir)) {
    mkdirSync(dir, { recursive: true });
    ensuredDirs.add(dir);
  }

  const filePath = resolve(dir, fileName);
  appendFile(filePath, `${JSON.stringify(entry)}\n`, "utf8").catch((err) =>
    console.error(`[Talkly] Log write failed: ${filePath}`, err)
  );
}

type RuntimeLogLevel = "info" | "warn" | "error";

function parseBooleanEnv(value: string | undefined, defaultValue: boolean) {
  if (value == null) return defaultValue;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function getRuntimeLogsEnabled() {
  return parseBooleanEnv(getEnv("TALKLY_RUNTIME_LOGS"), process.env.NODE_ENV === "production");
}

function getLogContentEnabled() {
  return parseBooleanEnv(getEnv("TALKLY_LOG_CONTENT"), false);
}

function getLogMaxChars() {
  const parsed = Number(getEnv("TALKLY_LOG_MAX_CHARS"));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 4000;
}

function truncateForLog(value: string) {
  const maxChars = getLogMaxChars();
  return value.length > maxChars ? `${value.slice(0, maxChars)}…` : value;
}

export function createLoggedTextField(field: string, value: string | undefined) {
  if (!value) return {};

  const entry: Record<string, unknown> = {
    [`${field}Length`]: value.length,
  };

  if (getLogContentEnabled()) {
    entry[field] = truncateForLog(value);
  }

  return entry;
}

export function logRuntimeEvent(
  level: RuntimeLogLevel,
  event: string,
  extra: Record<string, unknown> = {}
) {
  if (!getRuntimeLogsEnabled()) return;

  const entry = {
    timestamp: new Date().toISOString(),
    service: "talkly-server",
    environment: process.env.NODE_ENV || "development",
    level,
    event,
    ...extra,
  };

  const serialized = JSON.stringify(entry);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  console.log(serialized);
}
