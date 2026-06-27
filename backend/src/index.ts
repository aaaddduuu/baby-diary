import { Hono } from "hono";
import type { Context } from "hono";
import { cors } from "hono/cors";
import auth from "./routes/auth";
import babies from "./routes/babies";
import expenses from "./routes/expenses";
import records from "./routes/records";
import family from "./routes/family";
import moments from "./routes/moments";
import momentShares from "./routes/momentShares";
import sharedMoments from "./routes/sharedMoments";

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  MOMENT_PHOTOS: R2Bucket;
};

type AppEnv = {
  Bindings: Bindings;
};

const app = new Hono<AppEnv>();

const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_GENERAL_REQUESTS_PER_WINDOW = 300;
const MAX_AUTH_REQUESTS_PER_WINDOW = 20;
const MAX_JSON_BODY_BYTES = 64 * 1024;

type RateLimitBucket = {
  resetAt: number;
  count: number;
};

const rateLimitBuckets = new Map<string, RateLimitBucket>();

const blockedPathPatterns = [
  /^\/\.env(?:[./_-]|$)/i,
  /^\/\.git(?:\/|$)/i,
  /^\/\.svn(?:\/|$)/i,
  /^\/\.hg(?:\/|$)/i,
  /^\/(?:secrets?|credentials?|account|key|gcp-credentials)\.json$/i,
  /^\/(?:config|api\/config)$/i,
  /^\/actuator(?:\/|$)/i,
  /^\/wp-admin(?:\/|$)/i,
  /^\/wp-login\.php$/i,
];

function getClientId(c: Context<AppEnv>): string {
  return c.req.header("CF-Connecting-IP")
    || c.req.header("X-Forwarded-For")?.split(",")[0]?.trim()
    || "unknown";
}

function isSensitiveProbePath(pathname: string): boolean {
  return blockedPathPatterns.some((pattern) => pattern.test(pathname));
}

function cleanupExpiredBuckets(now: number): void {
  if (rateLimitBuckets.size < 1_000) return;

  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  }
}

function isRateLimited(key: string, limit: number, now: number): boolean {
  const bucket = rateLimitBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { resetAt: now + RATE_LIMIT_WINDOW_MS, count: 1 });
    cleanupExpiredBuckets(now);
    return false;
  }

  bucket.count += 1;
  return bucket.count > limit;
}

app.use("/api/*", cors({
  origin: ["https://baby.rocdo.app", "http://localhost:5173", "http://localhost:3000"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.use("*", async (c, next) => {
  await next();

  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  c.header("X-Frame-Options", "DENY");
});

app.use("*", async (c, next) => {
  const url = new URL(c.req.url);

  if (isSensitiveProbePath(url.pathname)) {
    return c.json({ success: false, data: null, message: "接口不存在" }, 404);
  }

  await next();
});

app.use("/api/*", async (c, next) => {
  if (c.req.method === "OPTIONS") {
    return next();
  }

  const contentLength = Number(c.req.header("Content-Length") || 0);
  const contentType = c.req.header("Content-Type") || "";
  if (contentType.includes("application/json") && contentLength > MAX_JSON_BODY_BYTES) {
    return c.json({ success: false, data: null, message: "请求内容过大" }, 413);
  }

  const clientId = getClientId(c);
  const now = Date.now();
  const url = new URL(c.req.url);
  const isAuthMutation = url.pathname === "/api/auth/login" || url.pathname === "/api/auth/register";
  const limit = isAuthMutation ? MAX_AUTH_REQUESTS_PER_WINDOW : MAX_GENERAL_REQUESTS_PER_WINDOW;
  const key = `${clientId}:${isAuthMutation ? "auth" : "api"}`;

  if (isRateLimited(key, limit, now)) {
    return c.json({ success: false, data: null, message: "请求过于频繁，请稍后再试" }, 429);
  }

  await next();
});

app.route("/api/auth", auth);
app.route("/api/babies", babies);
app.route("/api/expenses", expenses);
app.route("/api/records", records);
app.route("/api/family", family);
app.route("/api/moments", moments);
app.route("/api/moment-shares", momentShares);
app.route("/api/shared-moments", sharedMoments);

app.get("/api/health", (c) => {
  return c.json({ success: true, data: { status: "ok", timestamp: Date.now() } });
});

app.notFound((c) => {
  return c.json({ success: false, data: null, message: "接口不存在" }, 404);
});

app.onError((err, c) => {
  return c.json({ success: false, data: null, message: err.message }, 500);
});

export default app;
