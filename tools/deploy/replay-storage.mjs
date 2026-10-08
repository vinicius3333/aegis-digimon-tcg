import { existsSync, readFileSync } from "node:fs";

const REQUIRED = [
  "AEGIS_REPLAY_S3_ENDPOINT",
  "AEGIS_REPLAY_S3_BUCKET",
  "AEGIS_REPLAY_S3_ACCESS_KEY",
  "AEGIS_REPLAY_S3_SECRET_KEY",
];
const ALLOWED = [...REQUIRED, "AEGIS_REPLAY_S3_REGION"];

/** Installed independently of releases. Never log this object: it contains S3 credentials. */
export function readReplayStorageEnvironment(state) {
  const path = `${state}/replay-storage.json`;
  if (!existsSync(path)) return {};
  const input = JSON.parse(readFileSync(path, "utf8"));
  if (
    !input ||
    Array.isArray(input) ||
    typeof input !== "object" ||
    Object.keys(input).some((name) => !ALLOWED.includes(name)) ||
    REQUIRED.some((name) => typeof input[name] !== "string" || !input[name])
  ) {
    throw new Error("Invalid installed replay storage configuration");
  }
  const endpoint = new URL(input.AEGIS_REPLAY_S3_ENDPOINT);
  if (!["http:", "https:"].includes(endpoint.protocol) || endpoint.username || endpoint.password)
    throw new Error("Invalid replay storage endpoint");
  if (
    input.AEGIS_REPLAY_S3_REGION !== undefined &&
    (typeof input.AEGIS_REPLAY_S3_REGION !== "string" || !input.AEGIS_REPLAY_S3_REGION)
  )
    throw new Error("Invalid replay storage region");
  return input;
}
