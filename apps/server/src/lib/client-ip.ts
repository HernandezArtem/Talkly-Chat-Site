import { getConnInfo } from "@hono/node-server/conninfo";
import type { Context } from "hono";
import { getEnv } from "./env";

function trustProxy(): boolean {
  const raw = getEnv("CHATTR_TRUST_PROXY");
  if (!raw) return false;
  return raw === "1" || raw.toLowerCase() === "true";
}

/**
 * Resolves the remote client IP.
 *
 * When CHATTR_TRUST_PROXY is enabled, honors the first entry of
 * `X-Forwarded-For` (the original client, not the last hop). Otherwise
 * falls back to the socket remote address from the Node.js adapter.
 *
 * Proxy headers are ignored by default because they're trivially spoofable
 * on any server not fronted by a trusted load balancer.
 */
export function getClientIp(c: Context): string {
  if (trustProxy()) {
    const xff = c.req.header("x-forwarded-for");
    if (xff) {
      const first = xff.split(",")[0]?.trim();
      if (first) return first;
    }
    const realIp = c.req.header("x-real-ip");
    if (realIp) return realIp.trim();
  }

  try {
    const info = getConnInfo(c);
    if (info.remote.address) return info.remote.address;
  } catch {
    /* fall through */
  }

  return "unknown";
}
