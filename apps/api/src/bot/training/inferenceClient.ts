import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { isDeepStrictEqual } from "node:util";
import type { trainingMetadata } from "./metadata.js";
import type { TrainingWindow } from "./policy.js";

const MAX_FRAME_BYTES = 16 * 1024 * 1024;

export interface InferenceClientOptions {
  command: string;
  args: string[];
  metadata: ReturnType<typeof trainingMetadata>;
  startupTimeoutMs?: number;
  requestTimeoutMs?: number;
  maxPending?: number;
}

interface PendingChoice {
  id: number;
  frame: string;
  actionCount: number;
  cancelled: boolean;
  resolve: (index: number) => void;
  reject: (error: Error) => void;
  removeAbort: () => void;
}

/** One local worker, one active frame, and a bounded FIFO shared by its bot seats. */
export class InferenceClient {
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly expectedMetadata: InferenceClientOptions["metadata"];
  private readonly requestTimeoutMs: number;
  private readonly maxPending: number;
  private readonly queue: PendingChoice[] = [];
  private active: PendingChoice | undefined;
  private nextId = 0;
  private buffer = "";
  private stderr = "";
  private failure: Error | undefined;
  private ready = false;
  private requestTimer: ReturnType<typeof setTimeout> | undefined;
  private startupTimer: ReturnType<typeof setTimeout> | undefined;
  private killTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly startup: Promise<void>;
  private readonly exited: Promise<void>;
  private resolveStartup!: () => void;
  private rejectStartup!: (error: Error) => void;
  private checkpointHash = "";

  static async start(options: InferenceClientOptions): Promise<InferenceClient> {
    const client = new InferenceClient(options);
    try {
      await client.startup;
      return client;
    } catch (error) {
      await client.close();
      throw error;
    }
  }

  private constructor(options: InferenceClientOptions) {
    const startupTimeoutMs = options.startupTimeoutMs ?? 30_000;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 1_000;
    this.maxPending = options.maxPending ?? 32;
    for (const value of [startupTimeoutMs, this.requestTimeoutMs, this.maxPending]) {
      if (!Number.isSafeInteger(value) || value < 1) throw new Error("Inference limits must be positive integers");
    }
    this.expectedMetadata = structuredClone(options.metadata);
    this.startup = new Promise<void>((resolve, reject) => {
      this.resolveStartup = resolve;
      this.rejectStartup = reject;
    });
    this.child = spawn(options.command, options.args, { shell: false, stdio: ["pipe", "pipe", "pipe"] });
    this.exited = new Promise<void>((resolve) => {
      this.child.once("close", (code, signal) => {
        this.fail(new Error(`Inference worker closed (${code ?? signal}): ${this.stderr}`));
        clearTimeout(this.killTimer);
        resolve();
      });
    });
    this.child.on("error", (error) => this.fail(error));
    this.child.stdin.on("error", (error) => this.fail(error));
    this.child.stdout.setEncoding("utf8");
    this.child.stderr.setEncoding("utf8");
    this.child.stderr.on("data", (chunk: string) => {
      this.stderr = (this.stderr + chunk).slice(-8192);
    });
    this.child.stdout.on("data", (chunk: string) => this.receive(chunk));
    this.startupTimer = setTimeout(() => this.fail(new Error("Inference startup timed out")), startupTimeoutMs);
  }

  get checkpointSha256(): string {
    return this.checkpointHash;
  }

  async choose(window: TrainingWindow, signal: AbortSignal): Promise<number> {
    if (this.failure) return Promise.reject(this.failure);
    if (!this.ready) return Promise.reject(new Error("Inference worker is not ready"));
    if (signal.aborted) return Promise.reject(this.abortError(signal));
    if (!window.actions.length) return Promise.reject(new Error("No inference candidates"));
    if (this.queue.length + Number(this.active !== undefined) >= this.maxPending)
      return Promise.reject(new Error("Inference queue is full"));
    const id = ++this.nextId;
    const frame = JSON.stringify({ type: "choose", requestId: id, window }) + "\n";
    if (Buffer.byteLength(frame) > MAX_FRAME_BYTES) return Promise.reject(new Error("Inference frame exceeds limit"));
    return new Promise<number>((resolve, reject) => {
      const pending: PendingChoice = {
        id,
        frame,
        actionCount: window.actions.length,
        cancelled: false,
        resolve,
        reject,
        removeAbort: () => signal.removeEventListener("abort", abort),
      };
      const abort = () => {
        pending.cancelled = true;
        pending.removeAbort();
        pending.reject(this.abortError(signal));
        const queued = this.queue.indexOf(pending);
        if (queued >= 0) this.queue.splice(queued, 1);
        // An active reply still belongs to this ID. Consume it or hit the hard worker deadline.
      };
      signal.addEventListener("abort", abort, { once: true });
      this.queue.push(pending);
      this.pump();
    });
  }

  async close(): Promise<void> {
    this.fail(new Error("Inference client closed"));
    await this.exited;
  }

  private abortError(signal: AbortSignal): Error {
    return signal.reason instanceof Error ? signal.reason : new Error("Inference request aborted");
  }

  private pump(): void {
    if (this.failure || this.active !== undefined) return;
    const pending = this.queue.shift();
    if (pending === undefined) return;
    this.active = pending;
    this.requestTimer = setTimeout(() => this.fail(new Error("Inference request timed out")), this.requestTimeoutMs);
    this.child.stdin.write(pending.frame, (error) => {
      if (error) this.fail(error);
    });
  }

  private receive(chunk: string): void {
    if (this.failure) return;
    this.buffer += chunk;
    if (Buffer.byteLength(this.buffer) > MAX_FRAME_BYTES) {
      this.fail(new Error("Oversized inference reply"));
      return;
    }
    let newline: number;
    while ((newline = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, newline);
      this.buffer = this.buffer.slice(newline + 1);
      try {
        this.message(JSON.parse(line));
      } catch (error) {
        this.fail(error instanceof Error ? error : new Error(String(error)));
        return;
      }
      if (this.failure) return;
    }
  }

  private message(message: unknown): void {
    if (message === null || typeof message !== "object") throw new Error("Invalid inference reply");
    const value = message as Record<string, unknown>;
    if (!this.ready) {
      if (
        value.type !== "ready" ||
        value.protocolVersion !== 1 ||
        !Number.isSafeInteger(value.featureVersion) ||
        (value.featureVersion as number) < 1 ||
        !isDeepStrictEqual(value.metadata, this.expectedMetadata) ||
        typeof value.checkpointSha256 !== "string" ||
        !/^[a-f0-9]{64}$/.test(value.checkpointSha256)
      )
        throw new Error("Inference checkpoint/runtime mismatch");
      this.checkpointHash = value.checkpointSha256;
      this.ready = true;
      clearTimeout(this.startupTimer);
      this.resolveStartup();
      return;
    }
    const pending = this.active;
    if (
      pending === undefined ||
      value.type !== "choice" ||
      value.requestId !== pending.id ||
      !Number.isSafeInteger(value.action) ||
      (value.action as number) < 0 ||
      (value.action as number) >= pending.actionCount
    )
      throw new Error("Invalid or stale inference choice");
    clearTimeout(this.requestTimer);
    pending.removeAbort();
    this.active = undefined;
    if (!pending.cancelled) pending.resolve(value.action as number);
    this.pump();
  }

  private fail(error: Error): void {
    if (this.failure) return;
    this.failure = error;
    clearTimeout(this.startupTimer);
    clearTimeout(this.requestTimer);
    this.rejectStartup(error);
    const pending = [...(this.active === undefined ? [] : [this.active]), ...this.queue];
    this.active = undefined;
    this.queue.length = 0;
    for (const choice of pending) {
      choice.removeAbort();
      choice.reject(error);
    }
    this.child.stdin.destroy();
    if (this.child.exitCode === null && this.child.signalCode === null) {
      this.child.kill();
      this.killTimer = setTimeout(() => this.child.kill("SIGKILL"), 500);
      this.killTimer.unref();
    }
  }
}
