import { describe, expect, it } from "vitest";
import { ContinuousEffectScope } from "./ContinuousEffectScope.js";

describe("ContinuousEffectScope", () => {
  it("restores the continuous tier after a nested triggered effect awaits", async () => {
    const scope = new ContinuousEffectScope();
    expect(scope.getStore()).toBeUndefined();
    await scope.run(true, async () => {
      await scope.run(false, async () => {
        await Promise.resolve();
        expect(scope.getStore()).toBe(false);
      });
      expect(scope.getStore()).toBe(true);
    });
    expect(scope.getStore()).toBeUndefined();
  });

  it("keeps sibling async flows independent within the same match", async () => {
    const scope = new ContinuousEffectScope();
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    await scope.run(true, async () => {
      const triggered = scope.run(false, async () => {
        await barrier;
        expect(scope.getStore()).toBe(false);
      });
      await Promise.resolve();
      expect(scope.getStore()).toBe(true);
      release();
      await triggered;
      expect(scope.getStore()).toBe(true);
    });
  });

  it("preserves both match contexts when one match is entered from another", async () => {
    const first = new ContinuousEffectScope();
    const second = new ContinuousEffectScope();
    await first.run(true, async () => {
      expect(second.getStore()).toBeUndefined();
      await second.run(false, async () => {
        await Promise.resolve();
        expect(first.getStore()).toBe(true);
        expect(second.getStore()).toBe(false);
        await first.run(false, async () => {
          await Promise.resolve();
          expect(first.getStore()).toBe(false);
          expect(second.getStore()).toBe(false);
        });
        expect(first.getStore()).toBe(true);
      });
      expect(second.getStore()).toBeUndefined();
    });
    expect(first.getStore()).toBeUndefined();
  });

  it("restores the parent context after synchronous and asynchronous errors", async () => {
    const scope = new ContinuousEffectScope();
    await scope.run(true, async () => {
      expect(() =>
        scope.run(false, () => {
          throw new Error("sync");
        }),
      ).toThrow("sync");
      expect(scope.getStore()).toBe(true);
      await expect(
        scope.run(false, async () => {
          await Promise.resolve();
          throw new Error("async");
        }),
      ).rejects.toThrow("async");
      expect(scope.getStore()).toBe(true);
    });
    expect(scope.getStore()).toBeUndefined();
  });
});
