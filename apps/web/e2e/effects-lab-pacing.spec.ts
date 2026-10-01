import { spawn, type ChildProcess } from "node:child_process";
import { connect } from "node:net";
import { fileURLToPath } from "node:url";
import { test, expect, type Page } from "@playwright/test";

/* A paced chain must keep moving in a real browser. The jsdom pacing harness replays the
   same scenarios on a fake clock, but a wait cycle between presentation steps only closes
   under the browser's own timing, so this drives the effects lab and watches the queue's
   trace. A queue that still owes steps and has not queued, started or
   finished one for STALL_MS is wedged; server batches alone do not count as progress. */

const STALL_MS = 10_000;
const QUIET_MS = 4_000;
const CUE_TRACE_KEY = "__aegisCueTrace";

type Trace = (() => string[]) & { reset(): void };

async function queueState(page: Page) {
  return page.evaluate((traceKey) => {
    const lines = (window as unknown as Record<string, Trace | undefined>)[traceKey]?.() ?? [];
    const pending = new Set<string>();
    const steps = lines.filter((line) => !/^\s*\d+ms batch /.test(line));
    for (const line of steps) {
      const [, phase, id] = /^\s*\d+ms (\S+)\s+(\S+)/.exec(line) ?? [];
      if (!id) continue;
      if (phase === "queued" || phase === "started") pending.add(id);
      else if (phase === "finished" || phase === "dropped") pending.delete(id);
    }
    const clauses = [...document.querySelectorAll(".narration-item")].map((item) =>
      (item.textContent ?? "").trim().slice(0, 60),
    );
    return { pending: [...pending], progress: `${steps.length}:${steps.at(-1) ?? ""}`, clauses };
  }, CUE_TRACE_KEY);
}

test.describe("effects lab pacing in the browser", () => {
  // The lab plays a real bot room, so it runs against the API's own entry point.
  let api: ChildProcess;
  test.beforeAll(async () => {
    api = spawn(process.execPath, ["dist/index.js"], {
      cwd: fileURLToPath(new URL("../../api/", import.meta.url)),
      env: { ...process.env, PORT: "2569" },
      stdio: "ignore",
    });
    await expect
      .poll(
        () =>
          new Promise<boolean>((resolve) => {
            const socket = connect(2569, "127.0.0.1", () => {
              socket.destroy();
              resolve(true);
            });
            socket.once("error", () => resolve(false));
          }),
        { timeout: 30_000 },
      )
      .toBe(true);
  });
  test.afterAll(() => {
    api.kill();
  });

  // The lab starts on the stacked preset; its tuner switches to sequential.
  for (const style of ["Stacked", "Sequential"]) {
    test(`the bot's start-of-main chain plays every clause without stalling (${style})`, async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.removeItem("aegis.dev.effects-lab.pacing");
        localStorage.setItem("aegis.effect-speed", "normal");
      });
      await page.goto("/dev/effects-lab?scenario=effects-lab-opponent-chain");
      const button = (name: RegExp) => page.getByRole("button", { name }).first();
      await expect(button(/END BREEDING/i)).toBeEnabled({ timeout: 45_000 });
      await page.getByRole("button", { name: style, exact: true }).click();
      await button(/^Collapse/i).click();
      await button(/END BREEDING/i).click();
      await expect(button(/END PHASE/i)).toBeEnabled({ timeout: 20_000 });
      await page.evaluate((traceKey) => (window as unknown as Record<string, Trace>)[traceKey]!.reset(), CUE_TRACE_KEY);
      const startedAt = Date.now();
      await button(/END PHASE/i).click();

      const seenClauses = new Set<string>();
      let quietSince: number | undefined;
      let progress = "";
      let progressAt = Date.now();
      while (Date.now() - startedAt < 75_000) {
        await page.waitForTimeout(250);
        const state = await queueState(page);
        for (const clause of state.clauses) seenClauses.add(clause);
        if (state.progress !== progress) {
          progress = state.progress;
          progressAt = Date.now();
        }
        if (state.pending.length > 0) {
          quietSince = undefined;
          expect(
            Date.now() - progressAt,
            `queue wedged with ${state.pending.length} steps pending: ${state.pending.join(", ")}`,
          ).toBeLessThan(STALL_MS);
        } else if (seenClauses.size > 0) {
          quietSince ??= Date.now();
          if (Date.now() - quietSince > QUIET_MS) break;
        }
      }
      // The bot's five start-of-main effects each put their own clause on screen.
      expect(seenClauses.size).toBeGreaterThanOrEqual(5);
    });
  }
});
