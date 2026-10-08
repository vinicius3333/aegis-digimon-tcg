import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { readReplayStorageEnvironment } from "./replay-storage.mjs";

test("optional replay storage preserves existing deployments and validates the secret handoff", () => {
  const path = mkdtempSync(`${tmpdir()}/aegis-replay-env-`);
  try {
    assert.deepEqual(readReplayStorageEnvironment(path), {});
    const settings = {
      AEGIS_REPLAY_S3_ENDPOINT: "http://aegis-replay-s3:3900",
      AEGIS_REPLAY_S3_BUCKET: "aegis-replays",
      AEGIS_REPLAY_S3_ACCESS_KEY: "test-key",
      AEGIS_REPLAY_S3_SECRET_KEY: "test-secret",
      AEGIS_REPLAY_S3_REGION: "garage",
    };
    writeFileSync(`${path}/replay-storage.json`, JSON.stringify(settings));
    assert.deepEqual(readReplayStorageEnvironment(path), settings);
    for (const bad of [
      { ...settings, DATABASE_URL: "unexpected" },
      { ...settings, AEGIS_REPLAY_S3_SECRET_KEY: "" },
      { ...settings, AEGIS_REPLAY_S3_ENDPOINT: "file:///etc/passwd" },
      { ...settings, AEGIS_REPLAY_S3_REGION: {} },
    ]) {
      writeFileSync(`${path}/replay-storage.json`, JSON.stringify(bad));
      assert.throws(() => readReplayStorageEnvironment(path));
    }
  } finally {
    rmSync(path, { recursive: true });
  }
});
