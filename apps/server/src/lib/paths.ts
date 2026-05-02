import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

function hasServerFiles(candidate: string) {
  return existsSync(resolve(candidate, ".env.example"))
    || existsSync(resolve(candidate, "public", "demo.html"));
}

function detectServerRoot() {
  const candidates = [
    process.env.CHATTR_SERVER_ROOT,
    process.cwd(),
    resolve(process.cwd(), "apps", "server"),
    resolve(__dirname, ".."),
    resolve(__dirname, "..", ".."),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (hasServerFiles(candidate)) return candidate;
  }

  return process.cwd();
}

export const SERVER_ROOT = detectServerRoot();

export function resolveFromServerRoot(pathValue: string) {
  return isAbsolute(pathValue) ? pathValue : resolve(SERVER_ROOT, pathValue);
}

export function resolveServerPath(...segments: string[]) {
  return resolve(SERVER_ROOT, ...segments);
}
