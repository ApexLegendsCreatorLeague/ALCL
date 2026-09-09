import { createHash, randomUUID } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { WebSocketServer, type RawData } from "ws";
import { signLiveApiBatch } from "../src/features/data/liveapi-signature";

const COLLECTOR_VERSION = "1.0.0";
const port = Number(process.env.ALCL_LIVEAPI_PORT ?? 7777);
const host = process.env.ALCL_LIVEAPI_HOST ?? "127.0.0.1";
const ingestUrl = process.env.ALCL_INGEST_URL;
const secret = process.env.ALCL_LIVEAPI_SECRET;
const sourceKey = process.env.ALCL_LIVEAPI_SOURCE ?? "observer-pc";
const matchId = process.env.ALCL_MATCH_ID;
const sessionId = process.env.ALCL_SESSION_ID ?? randomUUID();
const archivePath = resolve(
  process.env.ALCL_LIVEAPI_ARCHIVE ?? `.liveapi/${sessionId}.ndjson`,
);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("ALCL_LIVEAPI_PORT must be a valid TCP port.");
}
if (!ingestUrl || !URL.canParse(ingestUrl)) {
  throw new Error("Set ALCL_INGEST_URL to the ALCL /api/liveapi/events endpoint.");
}
if (!secret || secret.length < 32) {
  throw new Error("ALCL_LIVEAPI_SECRET must contain at least 32 characters.");
}
if (!matchId || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(matchId)) {
  throw new Error("Set ALCL_MATCH_ID to the scheduled ALCL match UUID.");
}
if (!/^[a-zA-Z0-9_-]{3,80}$/.test(sourceKey)) {
  throw new Error("ALCL_LIVEAPI_SOURCE may only contain letters, numbers, _ and -.");
}
const configuredIngestUrl = ingestUrl;
const configuredSecret = secret;

type QueuedEvent = {
  id: string;
  sequence: number;
  receivedAt: string;
  body: Record<string, unknown>;
};

const queue: QueuedEvent[] = [];
let sequence = 0;
let sending = false;
let retryDelayMs = 1_000;
let retryTimer: NodeJS.Timeout | undefined;

await mkdir(dirname(archivePath), { recursive: true });

function rawText(data: RawData) {
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString("utf8");
  if (Array.isArray(data)) return Buffer.concat(data).toString("utf8");
  return data.toString("utf8");
}

function eventBodies(data: RawData): Record<string, unknown>[] {
  const text = rawText(data).trim();
  if (!text.startsWith("{") && !text.startsWith("[")) {
    throw new Error(
      "Received protobuf/binary data. Add +cl_liveapi_use_protobuf 0 to Apex launch options.",
    );
  }
  const decoded: unknown = JSON.parse(text);
  const values = Array.isArray(decoded) ? decoded : [decoded];
  if (
    values.some(
      (value) => value === null || typeof value !== "object" || Array.isArray(value),
    )
  ) {
    throw new Error("LiveAPI message must be a JSON object.");
  }
  return values as Record<string, unknown>[];
}

async function enqueue(body: Record<string, unknown>) {
  if (queue.length >= 10_000) {
    throw new Error("Collector queue reached 10,000 events; stop the match and check ALCL.");
  }
  sequence += 1;
  const receivedAt = new Date().toISOString();
  const id = createHash("sha256")
    .update(`${sessionId}.${sequence}.${JSON.stringify(body)}`)
    .digest("hex");
  const event = { id, sequence, receivedAt, body };
  queue.push(event);
  await appendFile(archivePath, `${JSON.stringify(event)}\n`, "utf8");
  if (queue.length >= 100) void flush();
}

function scheduleRetry() {
  if (retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = undefined;
    void flush();
  }, retryDelayMs);
  retryDelayMs = Math.min(retryDelayMs * 2, 30_000);
}

async function flush() {
  if (sending || queue.length === 0) return;
  sending = true;
  const events = queue.slice(0, 100);
  const body = JSON.stringify({
    sessionId,
    matchId,
    collectorVersion: COLLECTOR_VERSION,
    events,
  });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signLiveApiBatch(configuredSecret, timestamp, body);
  try {
    const response = await fetch(configuredIngestUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-alcl-source": sourceKey,
        "x-alcl-timestamp": timestamp,
        "x-alcl-signature": signature,
      },
      body,
      signal: AbortSignal.timeout(15_000),
    });
    const result = (await response.json().catch(() => ({}))) as {
      status?: string;
      message?: string;
    };
    if (!response.ok) {
      throw new Error(`${response.status}: ${result.message ?? response.statusText}`);
    }
    queue.splice(0, events.length);
    retryDelayMs = 1_000;
    console.log(
      `[ALCL] uploaded ${events.length} event(s); queue=${queue.length}; status=${result.status ?? "unknown"}`,
    );
    if (queue.length > 0) void flush();
  } catch (error) {
    console.error(`[ALCL] upload failed; events remain queued: ${(error as Error).message}`);
    scheduleRetry();
  } finally {
    sending = false;
  }
}

const server = new WebSocketServer({
  host,
  port,
  maxPayload: 1_000_000,
  perMessageDeflate: false,
});

server.on("connection", (socket, request) => {
  const remote = request.socket.remoteAddress;
  if (remote !== "127.0.0.1" && remote !== "::1" && remote !== "::ffff:127.0.0.1") {
    socket.close(1008, "Local observer connections only");
    return;
  }
  console.log("[ALCL] Apex observer connected. Collector is read-only.");
  socket.on("message", (data) => {
    try {
      for (const body of eventBodies(data)) void enqueue(body);
    } catch (error) {
      console.error(`[ALCL] ignored invalid event: ${(error as Error).message}`);
    }
  });
  socket.on("close", () => console.log("[ALCL] Apex observer disconnected."));
});

server.on("listening", () => {
  console.log(`[ALCL] LiveAPI collector ${COLLECTOR_VERSION}`);
  console.log(`[ALCL] session=${sessionId} match=${matchId}`);
  console.log(`[ALCL] listening on ws://${host}:${port}`);
  console.log(`[ALCL] local archive: ${archivePath}`);
});
server.on("error", (error) => {
  console.error(`[ALCL] WebSocket server failed: ${error.message}`);
  process.exitCode = 1;
});

const interval = setInterval(() => void flush(), 1_000);

async function shutdown() {
  clearInterval(interval);
  if (retryTimer) clearTimeout(retryTimer);
  await flush();
  server.close();
}

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
