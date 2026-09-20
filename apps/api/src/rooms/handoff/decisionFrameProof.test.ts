import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { DecisionExecutionFrame } from "../../engine/decisions/index.js";

const apiRoot = resolve(process.cwd());
const workerPath = resolve(apiRoot, "dist/rooms/handoff/decisionWorker.js");
const children = new Set<ReturnType<typeof spawn>>();

afterEach(() => {
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
  }
  children.clear();
});

describe("serializable pending-decision execution frame", () => {
  it("answers a trigger-order decision in a new process and selects the same continuation", async () => {
    const origin = await runWorker("origin");
    expect(origin.code, origin.stderr).toBe(0);
    const originResult = JSON.parse(resultLine(origin.stdout)) as {
      pid: number;
      frame: DecisionExecutionFrame;
      selectedIndex: number | null;
      continuation: unknown;
      selectedKey: string;
    };

    // The origin process has exited before the destination starts; no Promise resolver or
    // resolver stack from its in-memory DecisionManager can participate in the answer.
    expect(Object.hasOwn(originResult.frame, "resolve")).toBe(false);
    const destination = await runWorker("destination", JSON.stringify(originResult.frame));
    expect(destination.code, destination.stderr).toBe(0);
    const destinationResult = JSON.parse(resultLine(destination.stdout)) as {
      pid: number;
      pendingDecisionCleared: boolean;
      continuation: unknown;
      selectedKey: string;
    };

    expect(destinationResult.pid).not.toBe(originResult.pid);
    expect(originResult.selectedIndex).toBe(1);
    expect(destinationResult.pendingDecisionCleared).toBe(true);
    expect(destinationResult.selectedKey).toBe(originResult.selectedKey);
    expect(destinationResult.continuation).toEqual(originResult.continuation);
    expect(destinationResult.continuation).toMatchObject({
      continuationKind: "resolver.choose-order@1",
      value: { selectedTriggerKey: originResult.selectedKey, selectedIndex: 1 },
    });
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
  const line = stdout.split("\n").find((candidate) => candidate.startsWith("HANDOFF_DECISION_RESULT:"));
  if (line === undefined) throw new Error(`worker did not emit a result line. stdout: ${stdout}`);
  return line.slice("HANDOFF_DECISION_RESULT:".length);
}

interface WorkerOutput {
  readonly code: number | null;
  readonly stdout: string;
  readonly stderr: string;
}
