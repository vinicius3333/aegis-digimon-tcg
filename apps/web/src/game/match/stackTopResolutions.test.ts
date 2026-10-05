import { expect, it } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import { createStackTopResolutions } from "./stackTopResolutions";

const resolution: ServerEvent = {
  kind: "stackTopResolved",
  sequenceId: "strip-1",
  permanentId: "host",
  strippedInstanceId: "departing",
  topInstanceId: "promoted",
  baseDP: 7000,
  currentDP: 9000,
};

it("accepts the passive resolution after its physical peel has already finished", async () => {
  const results = createStackTopResolutions();
  let waits = 0;
  const received = await results.take({
    sequenceId: "strip-1",
    strippedInstanceId: "departing",
    permanentId: "host",
    context: {
      mode: "live",
      cancelled: false,
      skipping: false,
      wait: async () => {
        if (++waits === 2) results.record([resolution]);
      },
    },
  });
  expect(waits).toBe(2);
  expect(received).toEqual(resolution);
});

it("releases a missing resolution when the queue is cancelled", async () => {
  const results = createStackTopResolutions();
  let cancelled = false;
  expect(
    await results.take({
      sequenceId: "strip-1",
      strippedInstanceId: "departing",
      permanentId: "host",
      context: {
        mode: "live",
        get cancelled() {
          return cancelled;
        },
        skipping: false,
        wait: async () => {
          cancelled = true;
        },
      },
    }),
  ).toBeUndefined();
});

it("does not reuse a cleared resolution in a subsequent session", async () => {
  const results = createStackTopResolutions();
  results.record([resolution]);
  results.clear();
  let skipping = false;
  expect(
    await results.take({
      sequenceId: "strip-1",
      strippedInstanceId: "departing",
      permanentId: "host",
      context: {
        mode: "live",
        cancelled: false,
        get skipping() {
          return skipping;
        },
        wait: async () => {
          skipping = true;
        },
      },
    }),
  ).toBeUndefined();
});

it("rejects a resolution for a different physical host", async () => {
  const results = createStackTopResolutions();
  results.record([resolution]);
  await expect(
    results.take({
      sequenceId: "strip-1",
      strippedInstanceId: "departing",
      permanentId: "another-host",
      context: { mode: "live", cancelled: false, skipping: false, wait: async () => {} },
    }),
  ).rejects.toThrow("does not match the physical promotion");
});
