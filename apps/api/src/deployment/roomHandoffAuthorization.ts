import { createHmac, timingSafeEqual } from "node:crypto";
import type { RoomOwner } from "../db/roomHandoff/RoomHandoffStore.js";

const VERSION = 1;
const LIFETIME_MS = 60_000;

export type SourceAuthorizationClaims = {
  version: 1;
  transferId: string;
  sessionId: string;
  sourceGenerationId: string;
  destinationGenerationId: string;
  sourceOwnerEpoch: number;
  sourceOwner: RoomOwner;
  issuedAt: number;
  expiresAt: number;
};

/** A short-lived, cross-slot proof that the source inspected this exact owner for this transfer. */
export function issueSourceAuthorization(input: {
  secret: string | undefined;
  transferId: string;
  sessionId: string;
  sourceGenerationId: string;
  destinationGenerationId: string;
  sourceOwnerEpoch: number;
  sourceOwner: RoomOwner;
  now: number;
}): string {
  const secret = requireSecret(input.secret);
  const claims: SourceAuthorizationClaims = {
    version: VERSION,
    transferId: input.transferId,
    sessionId: input.sessionId,
    sourceGenerationId: input.sourceGenerationId,
    destinationGenerationId: input.destinationGenerationId,
    sourceOwnerEpoch: input.sourceOwnerEpoch,
    sourceOwner: input.sourceOwner,
    issuedAt: input.now,
    expiresAt: input.now + LIFETIME_MS,
  };
  const encoded = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${encoded}.${signature(secret, encoded)}`;
}

export function verifySourceAuthorization(input: {
  secret: string | undefined;
  token: string;
  now: number;
  transferId: string;
  sessionId: string;
  sourceGenerationId: string;
  destinationGenerationId: string;
  sourceOwnerEpoch: number;
  sourceOwner: RoomOwner;
}): SourceAuthorizationClaims | undefined {
  const secret = requireSecret(input.secret);
  const [encoded, providedSignature, extra] = input.token.split(".");
  if (!encoded || !providedSignature || extra !== undefined) return undefined;
  const expectedSignature = signature(secret, encoded);
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return undefined;

  let claims: unknown;
  try {
    claims = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return undefined;
  }
  if (!isClaims(claims)) return undefined;
  if (
    claims.expiresAt <= input.now ||
    claims.issuedAt > input.now + 5_000 ||
    claims.transferId !== input.transferId ||
    claims.sessionId !== input.sessionId ||
    claims.sourceGenerationId !== input.sourceGenerationId ||
    claims.destinationGenerationId !== input.destinationGenerationId ||
    claims.sourceOwnerEpoch !== input.sourceOwnerEpoch ||
    !sameOwner(claims.sourceOwner, input.sourceOwner)
  )
    return undefined;
  return claims;
}

function isClaims(value: unknown): value is SourceAuthorizationClaims {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const claims = value as Partial<SourceAuthorizationClaims>;
  return (
    claims.version === VERSION &&
    typeof claims.transferId === "string" &&
    typeof claims.sessionId === "string" &&
    typeof claims.sourceGenerationId === "string" &&
    typeof claims.destinationGenerationId === "string" &&
    Number.isSafeInteger(claims.sourceOwnerEpoch) &&
    Number.isSafeInteger(claims.issuedAt) &&
    Number.isSafeInteger(claims.expiresAt) &&
    isOwner(claims.sourceOwner)
  );
}

function isOwner(value: unknown): value is RoomOwner {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const owner = value as Partial<RoomOwner>;
  return (
    typeof owner.generationId === "string" &&
    typeof owner.processId === "string" &&
    typeof owner.roomId === "string"
  );
}

function sameOwner(left: RoomOwner, right: RoomOwner): boolean {
  return (
    left.generationId === right.generationId &&
    left.processId === right.processId &&
    left.roomId === right.roomId
  );
}

function signature(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function requireSecret(secret: string | undefined): string {
  if (typeof secret !== "string" || Buffer.byteLength(secret) < 32)
    throw new Error("room_handoff_descriptor_secret_unavailable");
  return secret;
}
