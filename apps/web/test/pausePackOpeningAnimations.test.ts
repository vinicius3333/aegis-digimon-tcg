import { afterEach, expect, it, vi } from "vitest";
import type { Page } from "@playwright/test";
import { pausePackOpeningAnimations } from "../e2e/pausePackOpeningAnimations";

afterEach(() => vi.useRealTimers());

it("resamples browser time when the running presentation clock overtakes a pause request", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(1000);
  const evaluate = vi.fn().mockResolvedValueOnce(10000).mockResolvedValueOnce(20000);
  const pauseAt = vi
    .fn()
    .mockRejectedValueOnce(new Error("clock.pauseAt: Cannot fast-forward to the past"))
    .mockResolvedValueOnce(undefined);
  const page = { evaluate, clock: { pauseAt } } as unknown as Page;
  await pausePackOpeningAnimations({ page });
  expect(evaluate).toHaveBeenCalledTimes(2);
  expect(pauseAt.mock.calls).toEqual([[11000], [21000]]);
});

it("does not hide unrelated presentation clock failures", async () => {
  const error = new Error("Page closed");
  const evaluate = vi.fn().mockResolvedValue(10000);
  const pauseAt = vi.fn().mockRejectedValue(error);
  const page = { evaluate, clock: { pauseAt } } as unknown as Page;
  await expect(pausePackOpeningAnimations({ page })).rejects.toBe(error);
  expect(pauseAt).toHaveBeenCalledTimes(1);
});

it("propagates a persistently overtaken clock after two fresh samples", async () => {
  const error = new Error("clock.pauseAt: Cannot fast-forward to the past");
  const evaluate = vi.fn().mockResolvedValue(10000);
  const pauseAt = vi.fn().mockRejectedValue(error);
  const page = { evaluate, clock: { pauseAt } } as unknown as Page;
  await expect(pausePackOpeningAnimations({ page })).rejects.toBe(error);
  expect(evaluate).toHaveBeenCalledTimes(2);
  expect(pauseAt).toHaveBeenCalledTimes(2);
});
