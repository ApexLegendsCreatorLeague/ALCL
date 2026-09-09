import { describe, expect, it } from "vitest";
import {
  signLiveApiBatch,
  verifyLiveApiBatchSignature,
} from "./liveapi-signature";

describe("LiveAPI batch authentication", () => {
  const secret = "a-secure-test-secret-with-more-than-32-characters";
  const timestamp = "1788681600";
  const rawBody = '{"events":[{"id":"example"}]}';

  it("accepts the collector signature within the replay window", () => {
    const signature = signLiveApiBatch(secret, timestamp, rawBody);
    expect(
      verifyLiveApiBatchSignature({
        secret,
        timestamp,
        rawBody,
        signature,
        now: Number(timestamp) * 1000 + 60_000,
      }),
    ).toBe(true);
  });

  it("rejects tampering, malformed signatures, weak secrets, and stale requests", () => {
    const signature = signLiveApiBatch(secret, timestamp, rawBody);
    const common = {
      secret,
      timestamp,
      rawBody,
      signature,
      now: Number(timestamp) * 1000,
    };
    expect(verifyLiveApiBatchSignature({ ...common, rawBody: `${rawBody} ` })).toBe(false);
    expect(verifyLiveApiBatchSignature({ ...common, signature: "not-hex" })).toBe(false);
    expect(verifyLiveApiBatchSignature({ ...common, secret: "too-short" })).toBe(false);
    expect(
      verifyLiveApiBatchSignature({
        ...common,
        now: Number(timestamp) * 1000 + 300_001,
      }),
    ).toBe(false);
  });
});
