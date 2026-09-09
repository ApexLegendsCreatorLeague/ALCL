import { createHmac, timingSafeEqual } from "node:crypto";

export function signLiveApiBatch(secret: string, timestamp: string, rawBody: string) {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
}

export function verifyLiveApiBatchSignature(input: {
  secret: string;
  timestamp: string;
  rawBody: string;
  signature: string;
  now?: number;
  maxSkewMs?: number;
}) {
  if (input.secret.length < 32 || !/^[a-f0-9]{64}$/i.test(input.signature)) {
    return false;
  }
  const timestampMs = Number(input.timestamp) * 1000;
  if (
    !Number.isFinite(timestampMs) ||
    Math.abs((input.now ?? Date.now()) - timestampMs) >
      (input.maxSkewMs ?? 300_000)
  ) {
    return false;
  }
  const expected = Buffer.from(
    signLiveApiBatch(input.secret, input.timestamp, input.rawBody),
    "hex",
  );
  const actual = Buffer.from(input.signature, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
