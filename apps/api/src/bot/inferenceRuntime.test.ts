import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { InferenceClientOptions } from "./training/inferenceClient.js";

const fixtures = vi.hoisted(() => ({
  start:
    vi.fn<(options: InferenceClientOptions) => Promise<{ checkpointSha256: string; close: () => Promise<void> }>>(),
  close: vi.fn<() => Promise<void>>(),
  metadata: { engineSha256: "verified-engine" },
}));
vi.mock("./training/inferenceClient.js", () => ({ InferenceClient: { start: fixtures.start } }));
vi.mock("./training/metadata.js", () => ({ trainingMetadata: () => fixtures.metadata }));

let runtime: typeof import("./inferenceRuntime.js");
beforeEach(async () => {
  vi.resetModules();
  fixtures.start.mockReset();
  fixtures.close.mockReset().mockResolvedValue(undefined);
  fixtures.start.mockResolvedValue({ checkpointSha256: "a".repeat(64), close: fixtures.close });
  runtime = await import("./inferenceRuntime.js");
});
afterEach(async () => runtime.stopBotInference());

describe("production checkpoint startup", () => {
  it("leaves inference disabled when no checkpoint is configured", async () => {
    await runtime.startBotInference({});
    expect(fixtures.start).not.toHaveBeenCalled();
  });

  it("validates runtime metadata and accepts the pinned model hash", async () => {
    await runtime.startBotInference({
      AEGIS_BOT_CHECKPOINT: "/models/checkpoint.pt",
      AEGIS_BOT_CHECKPOINT_SHA256: "a".repeat(64),
    });
    expect(fixtures.start).toHaveBeenCalledWith(
      expect.objectContaining({ command: "python3", metadata: fixtures.metadata, requestTimeoutMs: 2000 }),
    );
    expect(fixtures.start.mock.calls[0]![0].args).toContain("/models/checkpoint.pt");
    await expect(runtime.startBotInference({ AEGIS_BOT_CHECKPOINT: "/models/checkpoint.pt" })).rejects.toThrow(
      "already started",
    );
  });

  it("closes a worker whose weights differ from the configured hash", async () => {
    await expect(
      runtime.startBotInference({
        AEGIS_BOT_CHECKPOINT: "/models/checkpoint.pt",
        AEGIS_BOT_CHECKPOINT_SHA256: "b".repeat(64),
      }),
    ).rejects.toThrow("SHA256 mismatch");
    expect(fixtures.close).toHaveBeenCalledOnce();
  });

  it("rejects malformed hashes before spawning Python", async () => {
    await expect(
      runtime.startBotInference({
        AEGIS_BOT_CHECKPOINT: "/models/checkpoint.pt",
        AEGIS_BOT_CHECKPOINT_SHA256: "invalid",
      }),
    ).rejects.toThrow("Invalid bot checkpoint");
    expect(fixtures.start).not.toHaveBeenCalled();
  });
});
