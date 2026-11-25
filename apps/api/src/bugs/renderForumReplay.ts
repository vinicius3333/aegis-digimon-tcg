import { Worker } from "node:worker_threads";
import type { ReplayRecord } from "#api/replays/inputs/types";

const TIMEOUT_MS = 90_000;
const HEAP_MB = 512;

export function renderForumReplay(record: ReplayRecord): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL(import.meta.url.endsWith(".ts") ? "./forumReplayWorker.ts" : "./forumReplayWorker.js", import.meta.url),
      { workerData: { record }, resourceLimits: { maxOldGenerationSizeMb: HEAP_MB } },
    );
    const timer = setTimeout(() => {
      void worker.terminate();
      reject(new Error("replay render timed out"));
    }, TIMEOUT_MS);
    worker.once("message", (message: { file?: Uint8Array; error?: string }) => {
      clearTimeout(timer);
      void worker.terminate();
      if (message.file) resolve(message.file);
      else reject(new Error(message.error ?? "replay render failed"));
    });
    worker.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}
