import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const apiRoot = resolve(process.cwd());
const workerPath = resolve(apiRoot, "dist/rooms/handoff/decisionApiFrameWorker.js");
const children = new Set<ReturnType<typeof spawn>>();

afterEach(() => {
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
  }
  children.clear();
});

describe("serializable decision API continuation frames", () => {
  it("imports prompts in a new process and returns identical post-answer values", async () => {
    const origin = await runWorker("origin");
    expect(origin.code, origin.stderr).toBe(0);
    const originResult = JSON.parse(resultLine(origin.stdout)) as {
      pid: number;
      cases: Record<string, { frame: unknown; sourceResult: unknown; sourceContinuation: unknown }>;
    };
    expect(Object.keys(originResult.cases).sort()).toEqual(
      [
        "chooseOption",
        "chooseTargets",
        "mulliganKeep",
        "mulliganRedraw",
        "optional",
        "orderCards",
        "resolverOptional",
        "selectCards",
        "selectPermanents",
      ].sort(),
    );

    const destination = await runWorker("destination", JSON.stringify(originResult));
    expect(destination.code, destination.stderr).toBe(0);
    const destinationResult = JSON.parse(resultLine(destination.stdout)) as {
      pid: number;
      cases: Record<
        string,
        {
          continuation: unknown;
          wrongSeatContinuation: unknown;
          wrongSeatAnswerAccepted: boolean;
          duplicateContinuation: unknown;
          duplicateAnswerAccepted: boolean;
          pendingCleared: boolean;
        }
      >;
    };

    expect(destinationResult.pid).not.toBe(originResult.pid);
    for (const [name, source] of Object.entries(originResult.cases)) {
      const restored = destinationResult.cases[name];
      expect(restored, name).toBeDefined();
      expect(source.frame, name).not.toHaveProperty("resolve");
      expect(restored!.pendingCleared, name).toBe(true);
      expect(restored!.continuation, name).toEqual(source.sourceContinuation);
      if (!name.startsWith("mulligan")) {
        expect(restored!.wrongSeatAnswerAccepted, name).toBe(false);
        expect(restored!.wrongSeatContinuation, name).toBeUndefined();
        expect(restored!.duplicateAnswerAccepted, name).toBe(false);
        expect(restored!.duplicateContinuation, name).toBeUndefined();
      }
      expect((source.sourceContinuation as { value?: unknown }).value, name).toEqual(source.sourceResult);
      if (name === "mulliganKeep") expect(source.sourceResult, name).toBe(true);
      if (name === "mulliganRedraw") expect(source.sourceResult, name).toBe(false);
      if (name === "optional") expect(source.sourceResult, name).toBe(true);
      if (name === "resolverOptional") expect(source.sourceResult, name).toBe(true);
      if (name === "chooseTargets") expect(source.sourceResult, name).toEqual(["target-b"]);
      if (name === "selectCards") expect(source.sourceResult, name).toEqual(["card-c", "card-a"]);
      if (name === "selectPermanents") expect(source.sourceResult, name).toEqual(["permanent-b"]);
      if (name === "orderCards") expect(source.sourceResult, name).toEqual(["card-c", "card-b", "card-a"]);
      if (name === "chooseOption") expect(source.sourceResult, name).toBe(0);
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
  const line = stdout.split("\n").find((candidate) => candidate.startsWith("HANDOFF_API_FRAME_RESULT:"));
  if (line === undefined) throw new Error(`worker did not emit a result line. stdout: ${stdout}`);
  return line.slice("HANDOFF_API_FRAME_RESULT:".length);
}

interface WorkerOutput {
  readonly code: number | null;
  readonly stdout: string;
  readonly stderr: string;
}
