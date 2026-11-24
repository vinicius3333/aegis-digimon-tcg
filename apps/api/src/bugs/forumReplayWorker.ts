import { parentPort, workerData } from "node:worker_threads";
import type { ReplayRecord } from "#api/replays/inputs/types";

console.log = console.info = console.debug = console.warn = () => {};
await import("#api/cards/index");
const { exportPlayerReplay } = await import("#api/replays/inputs/export");

if (parentPort === null) throw new Error("Forum replay worker requires a parent port");
const port = parentPort;
exportPlayerReplay((workerData as { record: ReplayRecord }).record)
  .then((exported) => port.postMessage({ file: new Uint8Array(exported.file) }))
  .catch((error: unknown) => port.postMessage({ error: error instanceof Error ? error.message : String(error) }));
