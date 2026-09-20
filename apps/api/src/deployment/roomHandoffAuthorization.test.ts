import { describe, expect, it } from "vitest";
import { issueSourceAuthorization, verifySourceAuthorization } from "./roomHandoffAuthorization.js";

const secret = "test-only-secret-with-32-bytes-minimum";
const input = {
  transferId: "transfer-12345678",
  sessionId: "session-12345678",
  sourceGenerationId: "blue",
  destinationGenerationId: "green",
  sourceOwnerEpoch: 4,
  sourceOwner: { generationId: "blue", processId: "blue-api-2", roomId: "room-source" },
};

describe("room handoff source authorization", () => {
  it("authenticates exact transfer and owner claims across isolated slots", () => {
    const token = issueSourceAuthorization({ secret, ...input, now: 1_000 });
    expect(verifySourceAuthorization({ secret, token, ...input, now: 1_001 })).toMatchObject(input);
    expect(verifySourceAuthorization({
      secret,
      token,
      ...input,
      destinationGenerationId: "blue",
      now: 1_001,
    })).toBeUndefined();
    expect(verifySourceAuthorization({
      secret,
      token,
      ...input,
      sourceOwner: { ...input.sourceOwner, roomId: "different-room" },
      now: 1_001,
    })).toBeUndefined();
  });

  it("rejects tampered, expired, and under-keyed descriptors", () => {
    const token = issueSourceAuthorization({ secret, ...input, now: 1_000 });
    const [payload, signature] = token.split(".");
    expect(verifySourceAuthorization({ secret, token: `${payload}.${signature}x`, ...input, now: 1_001 })).toBeUndefined();
    expect(verifySourceAuthorization({ secret, token, ...input, now: 61_001 })).toBeUndefined();
    expect(() => issueSourceAuthorization({ secret: "short", ...input, now: 1_000 })).toThrow();
  });
});
