import { describe, expect, it } from "vitest";
import { setupEngine } from "./testkit/harness.js";

describe("continuous recompute concurrency", () => {
  it("waits for an in-flight rebuild and performs one coalesced refresh", async () => {
    const s = setupEngine();
    await s.ready();

    const internals = s.engine as unknown as {
      runContinuousPass: (ask: unknown) => Promise<void>;
    };
    const runContinuousPass = internals.runContinuousPass.bind(s.engine);
    let passCount = 0;
    let releaseFirstPass: () => void = () => undefined;
    let markFirstPassEntered: () => void = () => undefined;
    const firstPassEntered = new Promise<void>((resolve) => {
      markFirstPassEntered = resolve;
    });
    const firstPassBlocked = new Promise<void>((resolve) => {
      releaseFirstPass = resolve;
    });

    internals.runContinuousPass = async (ask) => {
      passCount += 1;
      if (passCount === 1) {
        markFirstPassEntered();
        await firstPassBlocked;
      }
      await runContinuousPass(ask);
    };

    const first = s.engine.recomputeContinuousEffects();
    await firstPassEntered;
    let secondSettled = false;
    const second = s.engine.recomputeContinuousEffects().finally(() => {
      secondSettled = true;
    });

    try {
      await Promise.resolve();
      expect(secondSettled).toBe(false);
      releaseFirstPass();
      await Promise.all([first, second]);
      expect(passCount).toBe(2);
    } finally {
      releaseFirstPass();
      await Promise.allSettled([first, second]);
      internals.runContinuousPass = runContinuousPass;
    }
  });
});
