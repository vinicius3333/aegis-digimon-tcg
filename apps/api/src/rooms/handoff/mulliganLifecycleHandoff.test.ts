import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const apiRoot = resolve(process.cwd());
const workerPath = resolve(apiRoot, "dist/rooms/handoff/mulliganLifecycleWorker.js");
const children = new Set<ReturnType<typeof spawn>>();

afterEach(() => {
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
  }
  children.clear();
});

describe("suspended production mulligan handoff", () => {
  it("continues the restored redraw exactly once to the same full match state in another process", async () => {
    const origin = await runWorker("origin");
    expect(origin.code, origin.stderr).toBe(0);
    const originResult = JSON.parse(resultLine(origin.stdout)) as {
      pid: number;
      boundary: { boundary: string; payloadSha256: string };
      runtime: { mulliganWindow?: { decision: { request: { decisionId: string } } } | null };
      finalState: {
        phase: string;
        pendingDecision?: unknown;
        players: Array<{ hand: unknown[]; deck: unknown[]; security: unknown[] }>;
      };
    };
    expect(originResult.boundary.boundary).toBe("mulligan-window");
    expect(originResult.boundary.payloadSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(originResult.runtime.mulliganWindow?.decision.request.decisionId).toBe("mull-2");

    const destination = await runWorker("destination", JSON.stringify(originResult));
    expect(destination.code, destination.stderr).toBe(0);
    const destinationResult = JSON.parse(resultLine(destination.stdout)) as {
      pid: number;
      finalState: unknown;
      duplicateAccepted: boolean;
      pendingCleared: boolean;
    };

    expect(destinationResult.pid).not.toBe(originResult.pid);
    expect(destinationResult.finalState).toEqual(originResult.finalState);
    expect(destinationResult.duplicateAccepted).toBe(false);
    expect(destinationResult.pendingCleared).toBe(true);
    expect(originResult.finalState.pendingDecision).toBeUndefined();
    expect(originResult.finalState.players).toHaveLength(2);
    for (const player of originResult.finalState.players) {
      expect(player.hand).toHaveLength(5);
      expect(player.security).toHaveLength(5);
    }
  });
});

function runWorker(mode: "origin" | "destination", input?: string): Promise<WorkerOutput> {
  const child = spawn(process.execPath, [workerPath, mode], {
    cwd: apiRoot,
    env: { ...process.env, NODE_ENV: "test" },
    stdio: ["pipe", "pipe", "pipe"],
  });
  children.add(child);
  return new Promise((resolveWorker, rejectWorker) => {
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => (stdout += chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => (stderr += chunk));
    child.on("error", rejectWorker);
    child.on("close", (code) => {
      children.delete(child);
      resolveWorker({ code, stdout: stdout.trim(), stderr: stderr.trim() });
    });
    child.stdin.end(input);
  });
}

function resultLine(stdout: string): string {
  const line = stdout.split("\n").find((candidate) => candidate.startsWith("MULLIGAN_LIFECYCLE_RESULT:"));
  if (line === undefined) throw new Error(`worker did not emit a result line. stdout: ${stdout}`);
  return line.slice("MULLIGAN_LIFECYCLE_RESULT:".length);
}

interface WorkerOutput {
  readonly code: number | null;
  readonly stdout: string;
  readonly stderr: string;
}
