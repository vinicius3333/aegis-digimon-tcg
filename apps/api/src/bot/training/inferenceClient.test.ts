import { describe, expect, it } from "vitest";
import { InferenceClient, type InferenceClientOptions } from "./inferenceClient.js";
import type { TrainingWindow } from "./policy.js";

const metadata: InferenceClientOptions["metadata"] = {
  schemaVersion: 4,
  statusFields: [],
  keywords: [],
  engineSha256: "test-engine",
  decks: [],
  cardIds: [],
};
const window: TrainingWindow = {
  observation: {
    schemaVersion: 4,
    seat: 0,
    turnSeat: 1,
    turn: 1,
    phase: "Main",
    memory: 0,
    players: [],
    revealed: [],
    history: { seenCardIds: [], knownCards: [], recent: [] },
  },
  kind: "block",
  selected: [],
  actions: [
    { intent: { type: "declineBlock" }, label: "Decline" },
    { intent: { type: "declareBlock", blockerPermanentId: "unit" }, label: "Block" },
  ],
};

function worker(behavior: string, options: Partial<InferenceClientOptions> = {}) {
  return InferenceClient.start({
    command: process.execPath,
    args: [
      "--input-type=module",
      "-e",
      `
      import { createInterface } from 'node:readline';
      console.log(JSON.stringify(${JSON.stringify({ type: "ready", protocolVersion: 1, featureVersion: 6, metadata, checkpointSha256: "a".repeat(64) })}));
      createInterface({ input: process.stdin }).on('line', (line) => {
        const request = JSON.parse(line);
        ${behavior}
      });
    `,
    ],
    metadata,
    ...options,
  });
}

describe("local checkpoint inference transport", () => {
  it("validates the handshake and returns a legal candidate index", async () => {
    const client = await worker(
      'console.log(JSON.stringify({ type: "choice", requestId: request.requestId, action: 1 }));',
    );
    try {
      expect(client.checkpointSha256).toBe("a".repeat(64));
      expect(await client.choose(window, new AbortController().signal)).toBe(1);
    } finally {
      await client.close();
    }
  });

  it("rejects a checkpoint from a different runtime before accepting requests", async () => {
    await expect(worker("", { metadata: { ...metadata, engineSha256: "different" } })).rejects.toThrow(
      "checkpoint/runtime mismatch",
    );
  });

  it.each([
    'console.log(JSON.stringify({ type: "choice", requestId: request.requestId, action: -1 }));',
    'console.log(JSON.stringify({ type: "choice", requestId: request.requestId, action: 2 }));',
    'console.log(JSON.stringify({ type: "choice", requestId: request.requestId + 1, action: 0 }));',
    'console.log(JSON.stringify({ type: "choice", requestId: request.requestId, action: "0" }));',
    'console.log("not-json");',
  ])("fails closed on a malformed worker response (%s)", async (behavior) => {
    const client = await worker(behavior);
    try {
      await expect(client.choose(window, new AbortController().signal)).rejects.toThrow(/inference|JSON/);
      await expect(client.choose(window, new AbortController().signal)).rejects.toThrow(/inference|JSON/);
    } finally {
      await client.close();
    }
  });

  it("removes cancelled queued work and consumes a late cancelled reply without misrouting it", async () => {
    const client = await worker(
      `
      if (request.requestId === 2) throw new Error('cancelled queued request was sent');
      setTimeout(() => console.log(JSON.stringify({ type: 'choice', requestId: request.requestId, action: 1 })), 25);
    `,
      { requestTimeoutMs: 500, maxPending: 3 },
    );
    try {
      const active = new AbortController();
      const queued = new AbortController();
      const first = client.choose(window, active.signal);
      const second = client.choose(window, queued.signal);
      const third = client.choose(window, new AbortController().signal);
      active.abort(new Error("active cancelled"));
      queued.abort(new Error("queued cancelled"));
      await expect(first).rejects.toThrow("active cancelled");
      await expect(second).rejects.toThrow("queued cancelled");
      expect(await third).toBe(1);
      expect(await client.choose(window, new AbortController().signal)).toBe(1);
    } finally {
      await client.close();
    }
  });

  it("bounds the queue and terminates a worker that never answers", async () => {
    const client = await worker("", { requestTimeoutMs: 50, maxPending: 1 });
    try {
      const first = client.choose(window, new AbortController().signal);
      await expect(client.choose(window, new AbortController().signal)).rejects.toThrow("queue is full");
      await expect(first).rejects.toThrow("request timed out");
    } finally {
      await client.close();
    }
  });

  it("bounds worker startup and reports a missing executable", async () => {
    await expect(
      InferenceClient.start({
        command: process.execPath,
        args: ["-e", "process.stdin.resume()"],
        metadata,
        startupTimeoutMs: 50,
      }),
    ).rejects.toThrow("startup timed out");
    await expect(
      InferenceClient.start({ command: "/nonexistent/aegis-inference-python", args: [], metadata }),
    ).rejects.toThrow("ENOENT");
  });

  it("rejects pending requests on close and refuses already-cancelled work", async () => {
    const client = await worker("", { requestTimeoutMs: 500 });
    const controller = new AbortController();
    controller.abort(new Error("already cancelled"));
    await expect(client.choose(window, controller.signal)).rejects.toThrow("already cancelled");
    const request = client.choose(window, new AbortController().signal);
    const closed = client.close();
    await expect(request).rejects.toThrow("client closed");
    await closed;
    await client.close();
  });
});
